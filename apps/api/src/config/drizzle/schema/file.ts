import {
  pgTable,
  text,
  timestamp,
  integer,
  uuid,
  boolean,
  real,
  jsonb,
} from "drizzle-orm/pg-core";

/**
 * Main file table - stores generic file metadata and references to specific file type tables
 * Uses a discriminated union pattern where 'type' determines which content table to reference
 */
export const file = pgTable("file", {
  id: uuid("id").primaryKey().defaultRandom(),
  
  // Discriminator fields
  type: text("type", { enum: ['image', 'video', 'audio', 'text'] }).notNull(),
  contentId: uuid("content_id").notNull(), // References the specific type table (imageFile.id, videoFile.id, etc.)
  
  // File system information
  filePath: text("file_path").notNull().unique(), // Relative path from uploads directory
  filename: text("filename").notNull(), // Original filename
  storedFilename: text("stored_filename").notNull(), // Filename on disk (may be different from original)
  
  // Generic file metadata
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(), // File size in bytes
  extension: text("extension"), // File extension (e.g., '.jpg', '.mp4')
  
  // Checksums for integrity verification
  md5Hash: text("md5_hash"),
  sha256Hash: text("sha256_hash"),
  
  // Upload information
  uploadedBy: text("uploaded_by"), // User ID who uploaded the file
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
  
  // File status
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
  deletedBy: text("deleted_by"), // User ID who deleted the file
  
  // Access control
  isPublic: boolean("is_public").notNull().default(false),
  permissions: jsonb("permissions").$type<{
    read?: string[]; // User IDs with read access
    write?: string[]; // User IDs with write access
    delete?: string[]; // User IDs with delete access
  }>(),
  
  // Metadata
  title: text("title"),
  description: text("description"),
  tags: jsonb("tags").$type<string[]>(),
  metadata: jsonb("metadata").$type<Record<string, any>>(), // Additional arbitrary metadata
  
  // Versioning
  version: integer("version").notNull().default(1),
  previousVersionId: uuid("previous_version_id"), // Reference to previous version of this file
  
  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/**
 * Image file metadata table
 * Contains detailed information specific to image files
 */
export const imageFile = pgTable("image_file", {
  id: uuid("id").primaryKey().defaultRandom(),
  
  // Image dimensions
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  aspectRatio: real("aspect_ratio"), // Calculated as width/height
  
  // Image format details
  format: text("format"), // JPEG, PNG, GIF, WebP, etc.
  colorSpace: text("color_space"), // RGB, CMYK, Grayscale, etc.
  bitDepth: integer("bit_depth"), // Bits per channel (8, 16, etc.)
  hasAlpha: boolean("has_alpha"), // Whether image has alpha channel
  
  // Quality and compression
  quality: integer("quality"), // JPEG quality, PNG compression level, etc.
  isProgressive: boolean("is_progressive"), // For JPEG
  isAnimated: boolean("is_animated"), // For GIF, WebP, APNG
  frameCount: integer("frame_count"), // Number of frames for animated images
  
  // Image analysis
  dominantColors: jsonb("dominant_colors").$type<string[]>(), // Hex color codes
  averageColor: text("average_color"), // Average color as hex
  brightness: real("brightness"), // 0-1 scale
  contrast: real("contrast"), // 0-1 scale
  
  // EXIF data
  exifData: jsonb("exif_data").$type<Record<string, any>>(),
  cameraModel: text("camera_model"),
  cameraMake: text("camera_make"),
  lensModel: text("lens_model"),
  focalLength: real("focal_length"),
  aperture: real("aperture"),
  shutterSpeed: text("shutter_speed"),
  iso: integer("iso"),
  flashUsed: boolean("flash_used"),
  
  // Geolocation from EXIF
  latitude: real("latitude"),
  longitude: real("longitude"),
  altitude: real("altitude"),
  gpsTimestamp: timestamp("gps_timestamp"),
  
  // Date taken (from EXIF)
  dateTaken: timestamp("date_taken"),
  
  // Orientation
  orientation: integer("orientation"), // EXIF orientation (1-8)
  
  // Processing status
  isProcessed: boolean("is_processed").notNull().default(false),
  processingStartedAt: timestamp("processing_started_at"),
  processingCompletedAt: timestamp("processing_completed_at"),
  processingError: text("processing_error"),
  
  // Thumbnails and variants
  thumbnailPath: text("thumbnail_path"),
  thumbnailSmallPath: text("thumbnail_small_path"),
  thumbnailMediumPath: text("thumbnail_medium_path"),
  thumbnailLargePath: text("thumbnail_large_path"),
  
  // Image variants (different sizes/formats)
  variants: jsonb("variants").$type<Array<{
    size: string; // e.g., 'small', 'medium', 'large', '1920x1080'
    path: string;
    width: number;
    height: number;
    format: string;
    fileSize: number;
  }>>(),
  
  // Accessibility
  altText: text("alt_text"),
  caption: text("caption"),
  
  // Copyright and attribution
  copyright: text("copyright"),
  artist: text("artist"),
  credit: text("credit"),
  source: text("source"),
  
  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/**
 * Video file metadata table
 * Contains detailed information specific to video files
 */
export const videoFile = pgTable("video_file", {
  id: uuid("id").primaryKey().defaultRandom(),
  
  // Video dimensions
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  aspectRatio: text("aspect_ratio"), // e.g., '16:9', '4:3'
  
  // Duration and frame information
  duration: real("duration").notNull(), // Duration in seconds
  frameRate: real("frame_rate"), // FPS
  totalFrames: integer("total_frames"),
  
  // Video codec and format
  videoCodec: text("video_codec"), // H.264, H.265/HEVC, VP9, AV1, etc.
  videoCodecProfile: text("video_codec_profile"), // Main, High, etc.
  videoBitrate: integer("video_bitrate"), // Video bitrate in kbps
  pixelFormat: text("pixel_format"), // yuv420p, etc.
  colorSpace: text("color_space"), // bt709, bt2020, etc.
  colorRange: text("color_range"), // tv, pc
  bitDepth: integer("bit_depth"), // 8, 10, 12 bit
  
  // Audio information
  hasAudio: boolean("has_audio").notNull().default(true),
  audioCodec: text("audio_codec"), // AAC, MP3, Opus, etc.
  audioBitrate: integer("audio_bitrate"), // Audio bitrate in kbps
  audioChannels: integer("audio_channels"), // 1 (mono), 2 (stereo), 6 (5.1), etc.
  audioSampleRate: integer("audio_sample_rate"), // Hz (e.g., 44100, 48000)
  audioLanguage: text("audio_language"),
  
  // Container format
  container: text("container"), // MP4, WebM, MKV, AVI, etc.
  
  // Processing status - CRITICAL REQUIREMENT
  isProcessed: boolean("is_processed").notNull().default(false),
  processingStartedAt: timestamp("processing_started_at"),
  processingCompletedAt: timestamp("processing_completed_at"),
  processingProgress: real("processing_progress"), // 0-100
  processingError: text("processing_error"),
  processingLogs: text("processing_logs"),
  
  // Transcoding status
  needsTranscoding: boolean("needs_transcoding").notNull().default(false),
  transcodingStartedAt: timestamp("transcoding_started_at"),
  transcodingCompletedAt: timestamp("transcoding_completed_at"),
  transcodingProgress: real("transcoding_progress"), // 0-100
  transcodingError: text("transcoding_error"),
  
  // Thumbnails
  thumbnailPath: text("thumbnail_path"),
  thumbnailTimestamp: real("thumbnail_timestamp"), // Seconds into video where thumbnail was captured
  previewGifPath: text("preview_gif_path"),
  spriteSheetPath: text("sprite_sheet_path"), // Sprite sheet for timeline scrubbing
  
  // Video quality analysis
  isHDR: boolean("is_hdr"), // High Dynamic Range
  hdrFormat: text("hdr_format"), // HDR10, Dolby Vision, etc.
  is4K: boolean("is_4k"),
  is8K: boolean("is_8k"),
  
  // Subtitles and closed captions
  hasSubtitles: boolean("has_subtitles").notNull().default(false),
  subtitleTracks: jsonb("subtitle_tracks").$type<Array<{
    language: string;
    format: string; // SRT, VTT, etc.
    path: string;
    isDefault: boolean;
  }>>(),
  
  // Chapters
  hasChapters: boolean("has_chapters").notNull().default(false),
  chapters: jsonb("chapters").$type<Array<{
    title: string;
    startTime: number; // Seconds
    endTime: number; // Seconds
  }>>(),
  
  // Streaming information
  isStreamable: boolean("is_streamable").notNull().default(false),
  hlsManifestPath: text("hls_manifest_path"), // Path to HLS playlist
  dashManifestPath: text("dash_manifest_path"), // Path to DASH manifest
  
  // Video variants (different qualities/formats)
  variants: jsonb("variants").$type<Array<{
    quality: string; // e.g., '720p', '1080p', '4K'
    path: string;
    width: number;
    height: number;
    videoCodec: string;
    videoBitrate: number;
    audioCodec: string;
    audioBitrate: number;
    fileSize: number;
  }>>(),
  
  // Metadata
  title: text("title"),
  description: text("description"),
  
  // Copyright and attribution
  copyright: text("copyright"),
  artist: text("artist"),
  director: text("director"),
  producer: text("producer"),
  studio: text("studio"),
  
  // Content ratings
  contentRating: text("content_rating"), // G, PG, PG-13, R, etc.
  ageRestriction: integer("age_restriction"),
  
  // Analysis
  sceneDetection: jsonb("scene_detection").$type<Array<{
    timestamp: number; // Seconds
    sceneType: string;
    confidence: number;
  }>>(),
  
  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/**
 * Audio file metadata table
 * Contains detailed information specific to audio files
 */
export const audioFile = pgTable("audio_file", {
  id: uuid("id").primaryKey().defaultRandom(),
  
  // Duration
  duration: real("duration").notNull(), // Duration in seconds
  
  // Audio codec and format
  audioCodec: text("audio_codec"), // MP3, AAC, FLAC, WAV, Opus, Vorbis, etc.
  audioCodecProfile: text("audio_codec_profile"),
  bitrate: integer("bitrate"), // Bitrate in kbps
  bitrateMode: text("bitrate_mode"), // CBR, VBR, ABR
  
  // Audio characteristics
  sampleRate: integer("sample_rate").notNull(), // Hz (e.g., 44100, 48000, 96000)
  channels: integer("channels").notNull(), // 1 (mono), 2 (stereo), etc.
  channelLayout: text("channel_layout"), // mono, stereo, 5.1, 7.1, etc.
  bitDepth: integer("bit_depth"), // 16, 24, 32 bit
  
  // Container format
  container: text("container"), // MP3, M4A, FLAC, WAV, OGG, etc.
  
  // Music metadata (ID3 tags, etc.)
  title: text("title"),
  artist: text("artist"),
  album: text("album"),
  albumArtist: text("album_artist"),
  composer: text("composer"),
  genre: text("genre"),
  year: integer("year"),
  trackNumber: integer("track_number"),
  totalTracks: integer("total_tracks"),
  discNumber: integer("disc_number"),
  totalDiscs: integer("total_discs"),
  
  // Additional metadata
  comment: text("comment"),
  lyrics: text("lyrics"),
  language: text("language"),
  
  // Album art
  hasAlbumArt: boolean("has_album_art").notNull().default(false),
  albumArtPath: text("album_art_path"),
  albumArtMimeType: text("album_art_mime_type"),
  
  // Audio analysis
  averageVolume: real("average_volume"), // dB
  peakVolume: real("peak_volume"), // dB
  dynamicRange: real("dynamic_range"), // dB
  loudnessLUFS: real("loudness_lufs"), // Loudness Units Full Scale
  
  // Waveform data for visualization
  waveformPath: text("waveform_path"), // Path to waveform image
  waveformData: jsonb("waveform_data").$type<number[]>(), // Simplified waveform data points
  
  // Processing status
  isProcessed: boolean("is_processed").notNull().default(false),
  processingStartedAt: timestamp("processing_started_at"),
  processingCompletedAt: timestamp("processing_completed_at"),
  processingError: text("processing_error"),
  
  // Transcoding status
  needsTranscoding: boolean("needs_transcoding").notNull().default(false),
  transcodingStartedAt: timestamp("transcoding_started_at"),
  transcodingCompletedAt: timestamp("transcoding_completed_at"),
  transcodingError: text("transcoding_error"),
  
  // Audio variants (different qualities/formats)
  variants: jsonb("variants").$type<Array<{
    quality: string; // e.g., '128kbps', '320kbps', 'lossless'
    path: string;
    codec: string;
    bitrate: number;
    fileSize: number;
  }>>(),
  
  // Copyright and ISRC
  copyright: text("copyright"),
  isrc: text("isrc"), // International Standard Recording Code
  publisher: text("publisher"),
  
  // Podcast-specific metadata
  isPodcast: boolean("is_podcast").notNull().default(false),
  podcastTitle: text("podcast_title"),
  episodeNumber: integer("episode_number"),
  seasonNumber: integer("season_number"),
  
  // Replay gain for volume normalization
  replayGainTrack: real("replay_gain_track"),
  replayGainAlbum: real("replay_gain_album"),
  
  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/**
 * Text file metadata table
 * Contains detailed information specific to text files
 */
export const textFile = pgTable("text_file", {
  id: uuid("id").primaryKey().defaultRandom(),
  
  // File format
  format: text("format"), // txt, md, json, xml, html, csv, etc.
  
  // Character encoding
  encoding: text("encoding").notNull().default('utf-8'), // UTF-8, ASCII, ISO-8859-1, etc.
  hasBOM: boolean("has_bom"), // Byte Order Mark
  
  // Line ending type
  lineEnding: text("line_ending"), // LF, CRLF, CR
  
  // Content statistics
  lineCount: integer("line_count"),
  wordCount: integer("word_count"),
  characterCount: integer("character_count"),
  characterCountNoSpaces: integer("character_count_no_spaces"),
  
  // Language detection
  language: text("language"), // en, fr, es, etc.
  languageConfidence: real("language_confidence"), // 0-1
  
  // Content type detection
  contentType: text("content_type"), // code, prose, data, markup, etc.
  isCode: boolean("is_code"),
  programmingLanguage: text("programming_language"), // javascript, python, etc.
  
  // Code-specific metadata (if isCode = true)
  syntaxHighlightingLanguage: text("syntax_highlighting_language"),
  linesOfCode: integer("lines_of_code"),
  commentLines: integer("comment_lines"),
  blankLines: integer("blank_lines"),
  
  // Markdown-specific metadata
  isMarkdown: boolean("is_markdown"),
  markdownHeadings: jsonb("markdown_headings").$type<Array<{
    level: number;
    text: string;
    lineNumber: number;
  }>>(),
  markdownLinks: jsonb("markdown_links").$type<Array<{
    text: string;
    url: string;
    lineNumber: number;
  }>>(),
  
  // JSON-specific metadata
  isJSON: boolean("is_json"),
  jsonValid: boolean("json_valid"),
  jsonSchema: jsonb("json_schema").$type<Record<string, any>>(),
  
  // CSV-specific metadata
  isCSV: boolean("is_csv"),
  csvDelimiter: text("csv_delimiter"),
  csvHeaderRow: boolean("csv_header_row"),
  csvColumns: jsonb("csv_columns").$type<Array<{
    name: string;
    index: number;
    type: string; // string, number, date, etc.
  }>>(),
  csvRowCount: integer("csv_row_count"),
  
  // XML/HTML-specific metadata
  isXML: boolean("is_xml"),
  isHTML: boolean("is_html"),
  xmlValid: boolean("xml_valid"),
  htmlValid: boolean("html_valid"),
  
  // Content preview
  preview: text("preview"), // First N characters of the file
  previewLength: integer("preview_length"),
  
  // Full text search
  fullText: text("full_text"), // Full content for searching
  searchVector: text("search_vector"), // PostgreSQL tsvector for full-text search
  
  // Processing status
  isProcessed: boolean("is_processed").notNull().default(false),
  processingStartedAt: timestamp("processing_started_at"),
  processingCompletedAt: timestamp("processing_completed_at"),
  processingError: text("processing_error"),
  
  // Analysis
  readingTime: integer("reading_time"), // Estimated reading time in seconds
  complexity: real("complexity"), // Readability score (0-1)
  sentiment: text("sentiment"), // positive, negative, neutral
  sentimentScore: real("sentiment_score"), // -1 to 1
  
  // Keywords and topics
  keywords: jsonb("keywords").$type<string[]>(),
  topics: jsonb("topics").$type<string[]>(),
  
  // Metadata
  title: text("title"),
  description: text("description"),
  author: text("author"),
  
  // Copyright
  copyright: text("copyright"),
  license: text("license"),
  
  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
