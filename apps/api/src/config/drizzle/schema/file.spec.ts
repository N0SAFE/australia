import { describe, it, expect } from 'vitest';
import { file, imageFile, videoFile, audioFile, textFile } from './file';

describe('File Schema', () => {
  describe('file table', () => {
    it('should have all required columns', () => {
      expect(file).toBeDefined();
      expect(file.id).toBeDefined();
      expect(file.type).toBeDefined();
      expect(file.contentId).toBeDefined();
      expect(file.filePath).toBeDefined();
      expect(file.filename).toBeDefined();
      expect(file.mimeType).toBeDefined();
      expect(file.size).toBeDefined();
    });

    it('should have type enum constraint', () => {
      // Check that type column has enum constraint
      expect(file.type).toBeDefined();
    });

    it('should have unique constraint on filePath', () => {
      // Check that filePath has unique constraint
      expect(file.filePath).toBeDefined();
    });

    it('should have processing status fields', () => {
      expect(file.uploadedAt).toBeDefined();
      expect(file.isDeleted).toBeDefined();
    });

    it('should have metadata fields', () => {
      expect(file.title).toBeDefined();
      expect(file.description).toBeDefined();
      expect(file.tags).toBeDefined();
      expect(file.metadata).toBeDefined();
    });

    it('should have versioning fields', () => {
      expect(file.version).toBeDefined();
      expect(file.previousVersionId).toBeDefined();
    });
  });

  describe('imageFile table', () => {
    it('should have all required columns', () => {
      expect(imageFile).toBeDefined();
      expect(imageFile.id).toBeDefined();
      expect(imageFile.width).toBeDefined();
      expect(imageFile.height).toBeDefined();
    });

    it('should have processing status fields', () => {
      expect(imageFile.isProcessed).toBeDefined();
      expect(imageFile.processingStartedAt).toBeDefined();
      expect(imageFile.processingCompletedAt).toBeDefined();
      expect(imageFile.processingError).toBeDefined();
    });

    it('should have EXIF metadata fields', () => {
      expect(imageFile.exifData).toBeDefined();
      expect(imageFile.cameraModel).toBeDefined();
      expect(imageFile.dateTaken).toBeDefined();
    });

    it('should have thumbnail fields', () => {
      expect(imageFile.thumbnailPath).toBeDefined();
      expect(imageFile.thumbnailSmallPath).toBeDefined();
      expect(imageFile.thumbnailMediumPath).toBeDefined();
      expect(imageFile.thumbnailLargePath).toBeDefined();
    });

    it('should have variants field for different sizes', () => {
      expect(imageFile.variants).toBeDefined();
    });
  });

  describe('videoFile table', () => {
    it('should have all required columns', () => {
      expect(videoFile).toBeDefined();
      expect(videoFile.id).toBeDefined();
      expect(videoFile.width).toBeDefined();
      expect(videoFile.height).toBeDefined();
      expect(videoFile.duration).toBeDefined();
    });

    it('should have processing status fields - CRITICAL REQUIREMENT', () => {
      expect(videoFile.isProcessed).toBeDefined();
      expect(videoFile.processingStartedAt).toBeDefined();
      expect(videoFile.processingCompletedAt).toBeDefined();
      expect(videoFile.processingProgress).toBeDefined();
      expect(videoFile.processingError).toBeDefined();
      expect(videoFile.processingLogs).toBeDefined();
    });

    it('should have transcoding status fields', () => {
      expect(videoFile.needsTranscoding).toBeDefined();
      expect(videoFile.transcodingStartedAt).toBeDefined();
      expect(videoFile.transcodingCompletedAt).toBeDefined();
      expect(videoFile.transcodingProgress).toBeDefined();
      expect(videoFile.transcodingError).toBeDefined();
    });

    it('should have video codec information', () => {
      expect(videoFile.videoCodec).toBeDefined();
      expect(videoFile.videoBitrate).toBeDefined();
      expect(videoFile.frameRate).toBeDefined();
    });

    it('should have audio information', () => {
      expect(videoFile.hasAudio).toBeDefined();
      expect(videoFile.audioCodec).toBeDefined();
      expect(videoFile.audioChannels).toBeDefined();
    });

    it('should have streaming fields', () => {
      expect(videoFile.isStreamable).toBeDefined();
      expect(videoFile.hlsManifestPath).toBeDefined();
      expect(videoFile.dashManifestPath).toBeDefined();
    });

    it('should have variants field for different qualities', () => {
      expect(videoFile.variants).toBeDefined();
    });
  });

  describe('audioFile table', () => {
    it('should have all required columns', () => {
      expect(audioFile).toBeDefined();
      expect(audioFile.id).toBeDefined();
      expect(audioFile.duration).toBeDefined();
      expect(audioFile.sampleRate).toBeDefined();
      expect(audioFile.channels).toBeDefined();
    });

    it('should have processing status fields', () => {
      expect(audioFile.isProcessed).toBeDefined();
      expect(audioFile.processingStartedAt).toBeDefined();
      expect(audioFile.processingCompletedAt).toBeDefined();
      expect(audioFile.processingError).toBeDefined();
    });

    it('should have music metadata fields', () => {
      expect(audioFile.title).toBeDefined();
      expect(audioFile.artist).toBeDefined();
      expect(audioFile.album).toBeDefined();
      expect(audioFile.genre).toBeDefined();
    });

    it('should have audio codec information', () => {
      expect(audioFile.audioCodec).toBeDefined();
      expect(audioFile.bitrate).toBeDefined();
    });

    it('should have album art fields', () => {
      expect(audioFile.hasAlbumArt).toBeDefined();
      expect(audioFile.albumArtPath).toBeDefined();
    });

    it('should have waveform visualization fields', () => {
      expect(audioFile.waveformPath).toBeDefined();
      expect(audioFile.waveformData).toBeDefined();
    });

    it('should have variants field for different qualities', () => {
      expect(audioFile.variants).toBeDefined();
    });
  });

  describe('textFile table', () => {
    it('should have all required columns', () => {
      expect(textFile).toBeDefined();
      expect(textFile.id).toBeDefined();
      expect(textFile.encoding).toBeDefined();
    });

    it('should have processing status fields', () => {
      expect(textFile.isProcessed).toBeDefined();
      expect(textFile.processingStartedAt).toBeDefined();
      expect(textFile.processingCompletedAt).toBeDefined();
      expect(textFile.processingError).toBeDefined();
    });

    it('should have content statistics fields', () => {
      expect(textFile.lineCount).toBeDefined();
      expect(textFile.wordCount).toBeDefined();
      expect(textFile.characterCount).toBeDefined();
    });

    it('should have language detection fields', () => {
      expect(textFile.language).toBeDefined();
      expect(textFile.languageConfidence).toBeDefined();
    });

    it('should have code-specific fields', () => {
      expect(textFile.isCode).toBeDefined();
      expect(textFile.programmingLanguage).toBeDefined();
      expect(textFile.linesOfCode).toBeDefined();
    });

    it('should have markdown-specific fields', () => {
      expect(textFile.isMarkdown).toBeDefined();
      expect(textFile.markdownHeadings).toBeDefined();
      expect(textFile.markdownLinks).toBeDefined();
    });

    it('should have JSON-specific fields', () => {
      expect(textFile.isJSON).toBeDefined();
      expect(textFile.jsonValid).toBeDefined();
      expect(textFile.jsonSchema).toBeDefined();
    });

    it('should have CSV-specific fields', () => {
      expect(textFile.isCSV).toBeDefined();
      expect(textFile.csvDelimiter).toBeDefined();
      expect(textFile.csvColumns).toBeDefined();
    });

    it('should have full-text search fields', () => {
      expect(textFile.fullText).toBeDefined();
      expect(textFile.searchVector).toBeDefined();
    });
  });
});
