# File Management Schema

## Overview

This comprehensive file management system uses a **discriminated union pattern** to track file uploads with extensive metadata. The system consists of 5 related tables:

1. **`file`** - Main table with generic file information
2. **`imageFile`** - Image-specific metadata
3. **`videoFile`** - Video-specific metadata  
4. **`audioFile`** - Audio-specific metadata
5. **`textFile`** - Text-specific metadata

## Architecture

### Discriminated Union Pattern

The `file` table uses a discriminated union pattern where:
- `type` field determines the file type: `'image'`, `'video'`, `'audio'`, or `'text'`
- `contentId` field references the corresponding specialized table's ID

```typescript
// Example: Video file entry
{
  id: 'uuid-1',
  type: 'video',
  contentId: 'uuid-video-1', // References videoFile.id
  filePath: 'videos/sample.mp4',
  // ... other generic fields
}
```

## Table Schemas

### 1. `file` Table (Main)

**Purpose**: Stores generic file information and references specialized tables.

**Key Fields**:

#### Discriminator Fields
- `type` - File type enum: 'image', 'video', 'audio', 'text'
- `contentId` - UUID reference to specialized table

#### File System
- `filePath` - Relative path from uploads directory (unique)
- `filename` - Original filename
- `storedFilename` - Filename on disk
- `extension` - File extension

#### Metadata
- `mimeType` - MIME type
- `size` - File size in bytes
- `md5Hash` - MD5 checksum
- `sha256Hash` - SHA256 checksum

#### Upload Information
- `uploadedBy` - User ID who uploaded
- `uploadedAt` - Upload timestamp

#### Status
- `isDeleted` - Soft delete flag
- `deletedAt` - Deletion timestamp
- `deletedBy` - User ID who deleted

#### Access Control
- `isPublic` - Public/private flag
- `permissions` - JSONB with read/write/delete arrays

#### Versioning
- `version` - Version number (default: 1)
- `previousVersionId` - Reference to previous version

### 2. `imageFile` Table

**Purpose**: Stores detailed image-specific metadata.

**Key Features**:

#### Dimensions & Format
- `width`, `height`, `aspectRatio`
- `format` - JPEG, PNG, GIF, WebP, etc.
- `colorSpace` - RGB, CMYK, Grayscale
- `bitDepth` - Bits per channel
- `hasAlpha` - Alpha channel flag

#### Quality & Compression
- `quality` - Compression quality
- `isProgressive` - Progressive JPEG flag
- `isAnimated` - Animated image flag
- `frameCount` - Number of frames

#### Image Analysis
- `dominantColors` - Array of hex colors
- `averageColor` - Average color hex
- `brightness` - 0-1 scale
- `contrast` - 0-1 scale

#### EXIF Metadata
- `exifData` - Full EXIF data as JSONB
- `cameraModel`, `cameraMake`, `lensModel`
- `focalLength`, `aperture`, `shutterSpeed`, `iso`
- `flashUsed` - Flash usage flag
- `dateTaken` - Photo capture date

#### Geolocation
- `latitude`, `longitude`, `altitude`
- `gpsTimestamp`

#### Processing
- `isProcessed` - Processing completion flag
- `processingStartedAt`, `processingCompletedAt`
- `processingError` - Error message if failed

#### Thumbnails & Variants
- `thumbnailPath`, `thumbnailSmallPath`, `thumbnailMediumPath`, `thumbnailLargePath`
- `variants` - JSONB array of different sizes/formats

#### Accessibility
- `altText` - Alt text for screen readers
- `caption` - Image caption

#### Copyright
- `copyright`, `artist`, `credit`, `source`

### 3. `videoFile` Table

**Purpose**: Stores detailed video-specific metadata with extensive processing tracking.

**Key Features**:

#### Dimensions & Duration
- `width`, `height`, `aspectRatio`
- `duration` - Duration in seconds
- `frameRate` - Frames per second
- `totalFrames` - Total frame count

#### Video Codec
- `videoCodec` - H.264, H.265/HEVC, VP9, AV1
- `videoCodecProfile` - Main, High, etc.
- `videoBitrate` - Video bitrate in kbps
- `pixelFormat` - yuv420p, etc.
- `colorSpace` - bt709, bt2020
- `bitDepth` - 8, 10, 12 bit

#### Audio Information
- `hasAudio` - Audio presence flag
- `audioCodec` - AAC, MP3, Opus
- `audioBitrate` - Audio bitrate in kbps
- `audioChannels` - 1 (mono), 2 (stereo), 6 (5.1)
- `audioSampleRate` - Hz (44100, 48000)

#### Processing Status (CRITICAL)
- `isProcessed` - Processing completion flag
- `processingStartedAt` - Processing start time
- `processingCompletedAt` - Processing completion time
- `processingProgress` - 0-100 progress percentage
- `processingError` - Error message if failed
- `processingLogs` - Processing logs

#### Transcoding
- `needsTranscoding` - Transcoding required flag
- `transcodingStartedAt`, `transcodingCompletedAt`
- `transcodingProgress` - 0-100 progress
- `transcodingError` - Error message

#### Thumbnails & Previews
- `thumbnailPath` - Thumbnail image path
- `thumbnailTimestamp` - Seconds into video for thumbnail
- `previewGifPath` - Animated preview GIF
- `spriteSheetPath` - Timeline scrubbing sprite sheet

#### Quality Features
- `isHDR` - High Dynamic Range flag
- `hdrFormat` - HDR10, Dolby Vision
- `is4K`, `is8K` - Resolution flags

#### Subtitles & Chapters
- `hasSubtitles` - Subtitles presence flag
- `subtitleTracks` - JSONB array of subtitle tracks
- `hasChapters` - Chapters presence flag
- `chapters` - JSONB array of chapter markers

#### Streaming
- `isStreamable` - Streaming ready flag
- `hlsManifestPath` - HLS playlist path
- `dashManifestPath` - DASH manifest path

#### Variants
- `variants` - JSONB array of different qualities (720p, 1080p, 4K)

#### Metadata & Ratings
- `title`, `description`
- `copyright`, `artist`, `director`, `producer`, `studio`
- `contentRating` - G, PG, PG-13, R
- `ageRestriction` - Age restriction number

### 4. `audioFile` Table

**Purpose**: Stores detailed audio-specific metadata.

**Key Features**:

#### Duration & Format
- `duration` - Duration in seconds
- `container` - MP3, M4A, FLAC, WAV, OGG

#### Audio Codec
- `audioCodec` - MP3, AAC, FLAC, WAV, Opus, Vorbis
- `audioCodecProfile`
- `bitrate` - Bitrate in kbps
- `bitrateMode` - CBR, VBR, ABR

#### Audio Characteristics
- `sampleRate` - Hz (44100, 48000, 96000)
- `channels` - 1 (mono), 2 (stereo)
- `channelLayout` - mono, stereo, 5.1, 7.1
- `bitDepth` - 16, 24, 32 bit

#### Music Metadata (ID3 Tags)
- `title`, `artist`, `album`, `albumArtist`
- `composer`, `genre`, `year`
- `trackNumber`, `totalTracks`
- `discNumber`, `totalDiscs`

#### Album Art
- `hasAlbumArt` - Album art presence flag
- `albumArtPath` - Album art image path
- `albumArtMimeType` - Album art MIME type

#### Audio Analysis
- `averageVolume` - Average volume in dB
- `peakVolume` - Peak volume in dB
- `dynamicRange` - Dynamic range in dB
- `loudnessLUFS` - Loudness Units Full Scale

#### Waveform Visualization
- `waveformPath` - Waveform image path
- `waveformData` - JSONB array of waveform data points

#### Processing
- `isProcessed`, `processingStartedAt`, `processingCompletedAt`
- `needsTranscoding`, `transcodingStartedAt`, `transcodingCompletedAt`

#### Variants
- `variants` - JSONB array of different qualities (128kbps, 320kbps, lossless)

#### Copyright & Identifiers
- `copyright`, `isrc` (International Standard Recording Code)
- `publisher`

#### Podcast Metadata
- `isPodcast` - Podcast flag
- `podcastTitle`, `episodeNumber`, `seasonNumber`

#### Replay Gain
- `replayGainTrack` - Track replay gain
- `replayGainAlbum` - Album replay gain

### 5. `textFile` Table

**Purpose**: Stores detailed text-specific metadata with content analysis.

**Key Features**:

#### Format & Encoding
- `format` - txt, md, json, xml, html, csv
- `encoding` - UTF-8, ASCII, ISO-8859-1 (default: 'utf-8')
- `hasBOM` - Byte Order Mark flag
- `lineEnding` - LF, CRLF, CR

#### Content Statistics
- `lineCount` - Number of lines
- `wordCount` - Number of words
- `characterCount` - Total characters
- `characterCountNoSpaces` - Characters excluding spaces

#### Language Detection
- `language` - Language code (en, fr, es)
- `languageConfidence` - Detection confidence (0-1)

#### Content Type
- `contentType` - code, prose, data, markup
- `isCode` - Code file flag
- `programmingLanguage` - javascript, python, etc.

#### Code-Specific Metadata
- `syntaxHighlightingLanguage`
- `linesOfCode` - Lines of actual code
- `commentLines` - Lines of comments
- `blankLines` - Blank lines

#### Markdown-Specific
- `isMarkdown` - Markdown flag
- `markdownHeadings` - JSONB array of headings
- `markdownLinks` - JSONB array of links

#### JSON-Specific
- `isJSON` - JSON flag
- `jsonValid` - Validation flag
- `jsonSchema` - JSONB schema

#### CSV-Specific
- `isCSV` - CSV flag
- `csvDelimiter` - Delimiter character
- `csvHeaderRow` - Header row flag
- `csvColumns` - JSONB array of column definitions
- `csvRowCount` - Number of rows

#### XML/HTML-Specific
- `isXML`, `isHTML`
- `xmlValid`, `htmlValid`

#### Content Preview
- `preview` - First N characters
- `previewLength` - Preview length
- `fullText` - Full content for searching
- `searchVector` - PostgreSQL tsvector

#### Processing
- `isProcessed`, `processingStartedAt`, `processingCompletedAt`

#### Analysis
- `readingTime` - Estimated reading time in seconds
- `complexity` - Readability score (0-1)
- `sentiment` - positive, negative, neutral
- `sentimentScore` - -1 to 1

#### Keywords & Topics
- `keywords` - JSONB array
- `topics` - JSONB array

#### Metadata & Copyright
- `title`, `description`, `author`
- `copyright`, `license`

## Usage Examples

### Creating a Video File Entry

```typescript
import { file, videoFile } from '@/config/drizzle/schema';

// 1. Insert video metadata
const videoMetadata = await db.insert(videoFile).values({
  width: 1920,
  height: 1080,
  duration: 120.5,
  videoCodec: 'H.264',
  videoBitrate: 5000,
  hasAudio: true,
  audioCodec: 'AAC',
  isProcessed: false,
}).returning();

// 2. Insert file record
const fileRecord = await db.insert(file).values({
  type: 'video',
  contentId: videoMetadata[0].id,
  filePath: 'videos/sample.mp4',
  filename: 'sample.mp4',
  storedFilename: 'video-uuid-123.mp4',
  mimeType: 'video/mp4',
  size: 52428800, // 50MB
  uploadedBy: 'user-uuid',
});
```

### Querying Files by Type

```typescript
// Get all video files with processing status
const videos = await db
  .select()
  .from(file)
  .leftJoin(videoFile, eq(file.contentId, videoFile.id))
  .where(eq(file.type, 'video'));

// Get unprocessed videos
const unprocessedVideos = await db
  .select()
  .from(file)
  .leftJoin(videoFile, eq(file.contentId, videoFile.id))
  .where(and(
    eq(file.type, 'video'),
    eq(videoFile.isProcessed, false)
  ));
```

### Updating Processing Status

```typescript
// Start processing
await db.update(videoFile)
  .set({
    isProcessed: false,
    processingStartedAt: new Date(),
    processingProgress: 0,
  })
  .where(eq(videoFile.id, videoId));

// Update progress
await db.update(videoFile)
  .set({
    processingProgress: 50,
  })
  .where(eq(videoFile.id, videoId));

// Complete processing
await db.update(videoFile)
  .set({
    isProcessed: true,
    processingCompletedAt: new Date(),
    processingProgress: 100,
  })
  .where(eq(videoFile.id, videoId));
```

## Migration

The schema has been generated as migration `0014_purple_slapstick.sql`.

To apply the migration:

```bash
# Push schema to database
bun run db:push

# Or run migration
bun run db:migrate
```

## Design Decisions

### Why Discriminated Union?

- **Type Safety**: TypeScript can infer the correct specialized table based on the `type` field
- **Flexibility**: Easy to add new file types in the future
- **Query Efficiency**: Can query all files generically or join with specific tables as needed
- **Data Integrity**: Clear relationship between generic and specialized data

### Why Separate Tables?

- **Schema Clarity**: Each file type has distinct fields
- **Performance**: Avoid sparse tables with many NULL values
- **Maintainability**: Easier to add type-specific fields without affecting other types
- **Indexing**: Can create type-specific indexes for optimal performance

### Why So Many Fields?

- **Comprehensive Tracking**: Handle all possible metadata scenarios
- **Future-Proof**: Fields available even if not immediately populated
- **Processing Pipeline**: Support complex file processing workflows
- **Search & Discovery**: Rich metadata enables powerful search capabilities
- **Compliance**: Track all necessary information for legal/compliance requirements

## Future Enhancements

Potential additions:
- Foreign key constraints from `file.contentId` to specialized tables
- Composite indexes for common query patterns
- Triggers for automatic timestamp updates
- Materialized views for file statistics
- Partitioning by file type for very large datasets
- Archive tables for deleted files
- Audit log tables for file access tracking
