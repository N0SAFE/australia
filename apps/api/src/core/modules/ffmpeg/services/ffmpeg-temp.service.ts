import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import { Readable } from 'stream';
import type {
  FfmpegInput,
  DanglingFile,
  LockFileContent,
  ProcessedFileContent,
  TempStorageStats,
} from '../interfaces/ffmpeg.interfaces';

/**
 * FFmpeg Temp File Service
 *
 * Manages temporary files for FFmpeg processing with namespace-based isolation.
 * Supports crash recovery by tracking processing jobs via lock files.
 *
 * Directory structure:
 * .ffmpeg-temp/
 * ├── {namespace...}/
 * │   └── {fileId}/
 * │       ├── .lock          # Lock file with metadata
 * │       ├── input.{ext}    # Copy of original file
 * │       ├── segment_*.mp4  # Processing segments
 * │       ├── concat_list.txt
 * │       └── output.mp4     # Final processed file
 *
 * The fileId is used as directory name to enable crash recovery:
 * - After crash, scan directories to find fileIds
 * - Each fileId directly maps to a database record
 * - No metadata parsing needed for basic recovery
 */
@Injectable()
export class FfmpegTempService implements OnModuleInit {
  private readonly logger = new Logger(FfmpegTempService.name);
  private readonly TEMP_BASE: string;
  private readonly MAX_AGE_MS: number;
  private readonly LOCK_FILE_NAME = '.lock';

  constructor() {
    // Default configuration - can be made configurable via ConfigService
    this.TEMP_BASE = path.resolve(process.cwd(), '.ffmpeg-temp');
    this.MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
  }

  async onModuleInit() {
    // Ensure base temp directory exists
    await this.ensureBaseDirExists();
  }

  /**
   * Ensure base temp directory exists.
   */
  private async ensureBaseDirExists(): Promise<void> {
    try {
      await fs.mkdir(this.TEMP_BASE, { recursive: true });
      this.logger.log(`FFmpeg temp directory: ${this.TEMP_BASE}`);
    } catch (error) {
      this.logger.error(`Failed to create temp directory: ${this.TEMP_BASE}`, error);
      throw error;
    }
  }

  /**
   * Get temp directory path for a file.
   * Structure: .ffmpeg-temp/{namespace...}/{fileId}/
   *
   * @param fileId - Database file ID (used as directory name)
   * @param namespace - Consumer service namespace (e.g., ['capsules'] or ['presentation', 'video'])
   */
  getTempDir(fileId: string, namespace: string[]): string {
    return path.join(this.TEMP_BASE, ...namespace, fileId);
  }

  /**
   * Get namespace directory path.
   * @param namespace - Consumer service namespace
   */
  getNamespaceDir(namespace: string[]): string {
    return path.join(this.TEMP_BASE, ...namespace);
  }

  /**
   * Initialize temp directory for processing.
   * Creates the directory structure and writes the input file.
   *
   * @param input - FfmpegInput with Web File object
   * @param namespace - Consumer service namespace
   * @returns Paths for input, output, and segments directory
   */
  async initializeProcessing(
    input: FfmpegInput,
    namespace: string[]
  ): Promise<{
    tempDir: string;
    inputPath: string;
    outputPath: string;
    segmentsDir: string;
  }> {
    const tempDir = this.getTempDir(input.id, namespace);

    // Check if already processing (lock file exists with running PID)
    if (await this.isActivelyProcessing(input.id, namespace)) {
      throw new Error(`File ${input.id} is already being processed`);
    }

    // Clean up any existing temp files from previous failed attempts
    await this.cleanupDir(tempDir);

    // Create fresh temp directory
    await fs.mkdir(tempDir, { recursive: true });

    const ext = path.extname(input.file.name) || '.mp4';
    const inputPath = path.join(tempDir, `input${ext}`);
    const outputPath = path.join(tempDir, 'output.mp4');
    const segmentsDir = path.join(tempDir, 'segments');

    // Create segments directory
    await fs.mkdir(segmentsDir, { recursive: true });

    // Write input file from Web File object
    await this.writeInputFile(input.file, inputPath);

    // Create lock file
    await this.createLockFile(tempDir, input, namespace);

    this.logger.debug(`Initialized processing for ${input.id} in ${tempDir}`);

    return { tempDir, inputPath, outputPath, segmentsDir };
  }

  /**
   * Write input file to disk from Web File object.
   */
  private async writeInputFile(file: File, inputPath: string): Promise<void> {
    // Convert Web File to Buffer using arrayBuffer()
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(inputPath, buffer);
    this.logger.debug(`Wrote input file from Web File: ${inputPath} (${String(buffer.length)} bytes)`);
  }

  /**
   * Create lock file to track active processing.
   */
  private async createLockFile(
    tempDir: string,
    input: FfmpegInput,
    namespace: string[]
  ): Promise<void> {
    const lockContent: LockFileContent = {
      fileId: input.id,
      namespace,
      originalName: input.file.name,
      mimeType: input.file.type || 'video/mp4',
      startedAt: new Date().toISOString(),
      pid: process.pid,
    };

    const lockPath = path.join(tempDir, this.LOCK_FILE_NAME);
    await fs.writeFile(lockPath, JSON.stringify(lockContent, null, 2));
    this.logger.debug(`Created lock file: ${lockPath}`);
  }

  /**
   * Read lock file contents.
   * @returns Lock file content or null if not found/invalid
   */
  async readLockFile(tempDir: string): Promise<LockFileContent | null> {
    const lockPath = path.join(tempDir, this.LOCK_FILE_NAME);
    try {
      const content = await fs.readFile(lockPath, 'utf-8');
      return JSON.parse(content) as LockFileContent;
    } catch {
      return null;
    }
  }

  /**
   * Check if a process with given PID is running.
   */
  private isProcessRunning(pid: number): boolean {
    try {
      // Sending signal 0 doesn't kill the process but checks if it exists
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if a file is actively being processed.
   * A file is actively processing if:
   * - Lock file exists
   * - PID in lock file is still running
   */
  async isActivelyProcessing(fileId: string, namespace: string[]): Promise<boolean> {
    const tempDir = this.getTempDir(fileId, namespace);
    const lockContent = await this.readLockFile(tempDir);

    if (!lockContent) {
      return false;
    }

    return this.isProcessRunning(lockContent.pid);
  }

  /**
   * Get all dangling files for a namespace.
   * A file is "dangling" if it has a lock file but the process
   * that created it is no longer running.
   *
   * @param namespace - Consumer service namespace
   * @returns Array of dangling files with metadata
   */
  async getFilesByNamespace(namespace: string[]): Promise<DanglingFile[]> {
    const namespaceDir = this.getNamespaceDir(namespace);
    const danglingFiles: DanglingFile[] = [];

    try {
      await fs.access(namespaceDir);
    } catch {
      // Namespace directory doesn't exist - no dangling files
      this.logger.debug(`Namespace directory doesn't exist: ${namespaceDir}`);
      return [];
    }

    try {
      const entries = await fs.readdir(namespaceDir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const fileId = entry.name;
        const tempDir = path.join(namespaceDir, fileId);

        try {
          const danglingFile = await this.checkForDanglingFile(tempDir, fileId, namespace);
          if (danglingFile) {
            danglingFiles.push(danglingFile);
          }
        } catch (error) {
          this.logger.debug(`Error checking ${tempDir}: ${String(error)}`);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to scan namespace directory: ${namespaceDir}`, error);
    }

    return danglingFiles;
  }

  /**
   * Check if a temp directory contains a dangling file.
   */
  private async checkForDanglingFile(
    tempDir: string,
    _fileId: string,
    _namespace: string[]
  ): Promise<DanglingFile | null> {
    const lockContent = await this.readLockFile(tempDir);

    if (!lockContent) {
      // No lock file - might be incomplete cleanup, ignore
      return null;
    }

    // Check if process is still running
    if (this.isProcessRunning(lockContent.pid)) {
      // Still processing, not dangling
      return null;
    }

    // Find input file
    const files = await fs.readdir(tempDir);
    const inputFile = files.find((f) => f.startsWith('input.'));
    const inputPath = inputFile ? path.join(tempDir, inputFile) : '';

    // Check for output file
    const outputPath = path.join(tempDir, 'output.mp4');
    const hasOutput = await this.fileExists(outputPath);

    return {
      fileId: lockContent.fileId,
      namespace: lockContent.namespace,
      tempDir,
      inputPath,
      outputPath: hasOutput ? outputPath : undefined,
      isComplete: hasOutput,
      lockMetadata: lockContent,
    };
  }

  /**
   * Get processed file as stream.
   *
   * @param fileId - Database file ID
   * @param namespace - Consumer service namespace
   * @returns Stream and metadata for the processed file
   * @throws Error if output file doesn't exist
   */
  async getProcessedFile(fileId: string, namespace: string[]): Promise<ProcessedFileContent> {
    const tempDir = this.getTempDir(fileId, namespace);
    const outputPath = path.join(tempDir, 'output.mp4');

    try {
      const stats = await fs.stat(outputPath);
      const stream = fsSync.createReadStream(outputPath);

      return {
        stream,
        size: stats.size,
        mimeType: 'video/mp4',
        path: outputPath,
      };
    } catch (error) {
      throw new Error(`Processed file not found for ${fileId}: ${String(error)}`);
    }
  }

  /**
   * Get the output file path for a file being processed.
   */
  getOutputPath(fileId: string, namespace: string[]): string {
    return path.join(this.getTempDir(fileId, namespace), 'output.mp4');
  }

  /**
   * Get the segments directory path for a file being processed.
   */
  getSegmentsDir(fileId: string, namespace: string[]): string {
    return path.join(this.getTempDir(fileId, namespace), 'segments');
  }

  /**
   * Delete all temp files for a file.
   * Call this after successfully storing the processed file.
   *
   * @param fileId - Database file ID
   * @param namespace - Consumer service namespace
   */
  async cleanup(fileId: string, namespace: string[]): Promise<void> {
    const tempDir = this.getTempDir(fileId, namespace);
    await this.cleanupDir(tempDir);
    this.logger.debug(`Cleaned up temp directory: ${tempDir}`);
  }

  /**
   * Delete a directory recursively.
   */
  private async cleanupDir(dirPath: string): Promise<void> {
    try {
      await fs.rm(dirPath, { recursive: true, force: true });
    } catch (error) {
      // Ignore errors if directory doesn't exist
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        this.logger.warn(`Failed to cleanup ${dirPath}:`, error);
      }
    }
  }

  /**
   * Clean up old temp files across all namespaces.
   * Called periodically to prevent disk space issues.
   *
   * @param maxAgeMs - Maximum age in milliseconds (default: 24 hours)
   * @returns Number of directories cleaned up
   */
  async cleanupOldFiles(maxAgeMs?: number): Promise<number> {
    const maxAge = maxAgeMs ?? this.MAX_AGE_MS;
    const cutoffTime = Date.now() - maxAge;
    let cleanedCount = 0;

    this.logger.log(`Cleaning up temp files older than ${String(maxAge / 1000 / 60 / 60)}h`);

    try {
      const namespaces = await this.getAllNamespaces();

      for (const namespace of namespaces) {
        const danglingFiles = await this.getFilesByNamespace(namespace);

        for (const file of danglingFiles) {
          const lockTime = new Date(file.lockMetadata.startedAt).getTime();

          if (lockTime < cutoffTime) {
            this.logger.log(`Cleaning up old temp file: ${file.fileId} (${file.tempDir})`);
            await this.cleanupDir(file.tempDir);
            cleanedCount++;
          }
        }
      }
    } catch (error) {
      this.logger.error('Error during old file cleanup', error);
    }

    this.logger.log(`Cleaned up ${String(cleanedCount)} old temp directories`);
    return cleanedCount;
  }

  /**
   * Get all namespaces that have temp files.
   */
  private async getAllNamespaces(): Promise<string[][]> {
    const namespaces: string[][] = [];

    const scanDir = async (dir: string, currentPath: string[]): Promise<void> => {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          if (!entry.isDirectory()) continue;

          const fullPath = path.join(dir, entry.name);
          const newPath = [...currentPath, entry.name];

          // Check if this is a file directory (has .lock file) or namespace directory
          const lockPath = path.join(fullPath, this.LOCK_FILE_NAME);
          const hasLock = await this.fileExists(lockPath);

          if (hasLock) {
            // This is a file directory, the parent is a namespace
            if (currentPath.length > 0 && !namespaces.some((ns) => this.arraysEqual(ns, currentPath))) {
              namespaces.push(currentPath);
            }
          } else {
            // Continue scanning subdirectories
            await scanDir(fullPath, newPath);
          }
        }
      } catch {
        // Directory doesn't exist or not accessible
      }
    };

    await scanDir(this.TEMP_BASE, []);
    return namespaces;
  }

  /**
   * Get temp storage statistics.
   */
  async getStats(): Promise<TempStorageStats> {
    const stats: TempStorageStats = {
      totalFiles: 0,
      totalSize: 0,
      byNamespace: new Map(),
      danglingCount: 0,
    };

    const namespaces = await this.getAllNamespaces();

    for (const namespace of namespaces) {
      const danglingFiles = await this.getFilesByNamespace(namespace);
      const nsKey = namespace.join('/');
      let nsFiles = 0;
      let nsSize = 0;

      for (const file of danglingFiles) {
        const dirSize = await this.getDirSize(file.tempDir);
        stats.totalFiles++;
        stats.totalSize += dirSize;
        nsFiles++;
        nsSize += dirSize;
        stats.danglingCount++;
      }

      if (nsFiles > 0) {
        stats.byNamespace.set(nsKey, { files: nsFiles, size: nsSize });
      }
    }

    return stats;
  }

  /**
   * Get total size of a directory.
   */
  private async getDirSize(dirPath: string): Promise<number> {
    let totalSize = 0;

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          totalSize += await this.getDirSize(fullPath);
        } else {
          const stat = await fs.stat(fullPath);
          totalSize += stat.size;
        }
      }
    } catch {
      // Ignore errors
    }

    return totalSize;
  }

  /**
   * Check if a file exists.
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Write a readable stream to a file.
   */
  private async streamToFile(stream: Readable, filePath: string): Promise<void> {
    const writeStream = fsSync.createWriteStream(filePath);
    return new Promise((resolve, reject) => {
      stream.pipe(writeStream);
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
      stream.on('error', reject);
    });
  }

  /**
   * Compare two arrays for equality.
   */
  private arraysEqual(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false;
    return a.every((val, index) => val === b[index]);
  }
}
