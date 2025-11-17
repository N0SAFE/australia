import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

// Ensure uploads directory exists
const uploadsDir = join(process.cwd(), 'uploads');
if (!existsSync(uploadsDir)) {
  mkdirSync(uploadsDir, { recursive: true });
}

// Subdirectories for different content types
const subdirs = ['images', 'videos', 'audio'];
subdirs.forEach((subdir) => {
  const path = join(uploadsDir, subdir);
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
});

export const multerConfig = {
  storage: diskStorage({
    destination: (req, file, cb) => {
      // Determine subdirectory based on mimetype
      let subdir = 'images';
      if (file.mimetype.startsWith('video/')) {
        subdir = 'videos';
      } else if (file.mimetype.startsWith('audio/')) {
        subdir = 'audio';
      }
      
      // Store files in appropriate subdirectory
      const destination = join(uploadsDir, subdir);
      cb(null, destination);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = `${Date.now().toString()}-${Math.round(Math.random() * 1e9).toString()}`;
      let prefix = 'file';
      if (file.mimetype.startsWith('image/')) {
        prefix = 'image';
      } else if (file.mimetype.startsWith('video/')) {
        prefix = 'video';
      } else if (file.mimetype.startsWith('audio/')) {
        prefix = 'audio';
      }
      cb(null, `${prefix}-${uniqueSuffix}${extname(file.originalname)}`);
    },
  }),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit for very large files
  },
  fileFilter: (req: any, file: Express.Multer.File, cb: any) => {
    const allowedMimes = [
      // Images
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      // Videos - will be converted to H.264
      'video/mp4',
      'video/webm',
      'video/ogg',
      'video/quicktime', // MOV files
      'video/x-msvideo', // AVI files
      'video/x-matroska', // MKV files
      'video/mpeg',
      'video/x-flv',
      // Audio
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/ogg',
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not supported`), false);
    }
  },
};

export const UPLOADS_DIR = uploadsDir;
