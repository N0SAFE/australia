# File Management Schema Diagram

## Table Relationships

```
┌─────────────────────────────────────────────────────────────────────┐
│                            file (Main Table)                         │
├─────────────────────────────────────────────────────────────────────┤
│ id: uuid (PK)                                                        │
│ type: enum('image', 'video', 'audio', 'text') ◄─── Discriminator   │
│ contentId: uuid ◄─────────────────────────────── Reference          │
│ filePath: text (unique)                                              │
│ filename: text                                                       │
│ storedFilename: text                                                 │
│ mimeType: text                                                       │
│ size: integer                                                        │
│ extension: text                                                      │
│ md5Hash: text                                                        │
│ sha256Hash: text                                                     │
│ uploadedBy: text                                                     │
│ uploadedAt: timestamp                                                │
│ isDeleted: boolean                                                   │
│ deletedAt: timestamp                                                 │
│ deletedBy: text                                                      │
│ isPublic: boolean                                                    │
│ permissions: jsonb                                                   │
│ title: text                                                          │
│ description: text                                                    │
│ tags: jsonb                                                          │
│ metadata: jsonb                                                      │
│ version: integer                                                     │
│ previousVersionId: uuid                                              │
│ createdAt: timestamp                                                 │
│ updatedAt: timestamp                                                 │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┬───────────────┐
                    │               │               │               │
                    ▼               ▼               ▼               ▼
          ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
          │  imageFile   │ │  videoFile   │ │  audioFile   │ │  textFile    │
          └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

## Detailed Table Structures

### 1. imageFile (48 columns)

```
┌────────────────────────────────────────┐
│           imageFile                     │
├────────────────────────────────────────┤
│ DIMENSIONS & FORMAT                     │
│ • width, height, aspectRatio           │
│ • format, colorSpace, bitDepth         │
│ • hasAlpha, quality                    │
│                                        │
│ ANIMATION                              │
│ • isAnimated, frameCount               │
│ • isProgressive                        │
│                                        │
│ IMAGE ANALYSIS                         │
│ • dominantColors, averageColor         │
│ • brightness, contrast                 │
│                                        │
│ EXIF METADATA                          │
│ • exifData (full EXIF as JSONB)        │
│ • cameraModel, cameraMake, lensModel   │
│ • focalLength, aperture, iso           │
│ • shutterSpeed, flashUsed              │
│ • dateTaken                            │
│                                        │
│ GEOLOCATION                            │
│ • latitude, longitude, altitude        │
│ • gpsTimestamp                         │
│                                        │
│ ORIENTATION                            │
│ • orientation (1-8)                    │
│                                        │
│ PROCESSING                             │
│ • isProcessed                          │
│ • processingStartedAt                  │
│ • processingCompletedAt                │
│ • processingError                      │
│                                        │
│ THUMBNAILS & VARIANTS                  │
│ • thumbnailPath (4 sizes)              │
│ • variants (JSONB array)               │
│                                        │
│ ACCESSIBILITY                          │
│ • altText, caption                     │
│                                        │
│ COPYRIGHT                              │
│ • copyright, artist, credit, source    │
└────────────────────────────────────────┘
```

### 2. videoFile (60 columns) ⭐ MOST COMPREHENSIVE

```
┌────────────────────────────────────────┐
│           videoFile                     │
├────────────────────────────────────────┤
│ DIMENSIONS & DURATION                   │
│ • width, height, aspectRatio           │
│ • duration, frameRate, totalFrames     │
│                                        │
│ VIDEO CODEC                            │
│ • videoCodec, videoCodecProfile        │
│ • videoBitrate, pixelFormat            │
│ • colorSpace, colorRange, bitDepth     │
│                                        │
│ AUDIO INFORMATION                      │
│ • hasAudio, audioCodec                 │
│ • audioBitrate, audioChannels          │
│ • audioSampleRate, audioLanguage       │
│                                        │
│ CONTAINER                              │
│ • container (MP4, WebM, MKV, etc.)     │
│                                        │
│ PROCESSING STATUS ⚡ CRITICAL          │
│ • isProcessed                          │
│ • processingStartedAt                  │
│ • processingCompletedAt                │
│ • processingProgress (0-100)           │
│ • processingError                      │
│ • processingLogs                       │
│                                        │
│ TRANSCODING STATUS                     │
│ • needsTranscoding                     │
│ • transcodingStartedAt                 │
│ • transcodingCompletedAt               │
│ • transcodingProgress (0-100)          │
│ • transcodingError                     │
│                                        │
│ THUMBNAILS & PREVIEWS                  │
│ • thumbnailPath, thumbnailTimestamp    │
│ • previewGifPath                       │
│ • spriteSheetPath                      │
│                                        │
│ QUALITY FEATURES                       │
│ • isHDR, hdrFormat                     │
│ • is4K, is8K                           │
│                                        │
│ SUBTITLES & CAPTIONS                   │
│ • hasSubtitles                         │
│ • subtitleTracks (JSONB array)         │
│                                        │
│ CHAPTERS                               │
│ • hasChapters                          │
│ • chapters (JSONB array)               │
│                                        │
│ STREAMING                              │
│ • isStreamable                         │
│ • hlsManifestPath                      │
│ • dashManifestPath                     │
│                                        │
│ VARIANTS (Different Qualities)         │
│ • variants (JSONB array)               │
│   - 720p, 1080p, 4K options            │
│                                        │
│ METADATA & RATINGS                     │
│ • title, description                   │
│ • copyright, artist, director          │
│ • producer, studio                     │
│ • contentRating, ageRestriction        │
│                                        │
│ SCENE DETECTION                        │
│ • sceneDetection (JSONB array)         │
└────────────────────────────────────────┘
```

### 3. audioFile (54 columns)

```
┌────────────────────────────────────────┐
│           audioFile                     │
├────────────────────────────────────────┤
│ DURATION & FORMAT                       │
│ • duration, container                  │
│                                        │
│ AUDIO CODEC                            │
│ • audioCodec, audioCodecProfile        │
│ • bitrate, bitrateMode (CBR/VBR/ABR)   │
│                                        │
│ AUDIO CHARACTERISTICS                  │
│ • sampleRate, channels                 │
│ • channelLayout, bitDepth              │
│                                        │
│ MUSIC METADATA (ID3 Tags)              │
│ • title, artist, album, albumArtist    │
│ • composer, genre, year                │
│ • trackNumber, totalTracks             │
│ • discNumber, totalDiscs               │
│ • comment, lyrics, language            │
│                                        │
│ ALBUM ART                              │
│ • hasAlbumArt                          │
│ • albumArtPath, albumArtMimeType       │
│                                        │
│ AUDIO ANALYSIS                         │
│ • averageVolume, peakVolume            │
│ • dynamicRange, loudnessLUFS           │
│                                        │
│ WAVEFORM VISUALIZATION                 │
│ • waveformPath                         │
│ • waveformData (JSONB array)           │
│                                        │
│ PROCESSING                             │
│ • isProcessed                          │
│ • processingStartedAt                  │
│ • processingCompletedAt                │
│ • processingError                      │
│                                        │
│ TRANSCODING                            │
│ • needsTranscoding                     │
│ • transcodingStartedAt                 │
│ • transcodingCompletedAt               │
│ • transcodingError                     │
│                                        │
│ VARIANTS (Different Qualities)         │
│ • variants (JSONB array)               │
│   - 128kbps, 320kbps, lossless         │
│                                        │
│ COPYRIGHT & IDENTIFIERS                │
│ • copyright, isrc, publisher           │
│                                        │
│ PODCAST METADATA                       │
│ • isPodcast, podcastTitle              │
│ • episodeNumber, seasonNumber          │
│                                        │
│ REPLAY GAIN                            │
│ • replayGainTrack, replayGainAlbum     │
└────────────────────────────────────────┘
```

### 4. textFile (54 columns)

```
┌────────────────────────────────────────┐
│           textFile                      │
├────────────────────────────────────────┤
│ FORMAT & ENCODING                       │
│ • format (txt, md, json, xml, etc.)    │
│ • encoding (UTF-8, ASCII, etc.)        │
│ • hasBOM, lineEnding                   │
│                                        │
│ CONTENT STATISTICS                     │
│ • lineCount, wordCount                 │
│ • characterCount                       │
│ • characterCountNoSpaces               │
│                                        │
│ LANGUAGE DETECTION                     │
│ • language, languageConfidence         │
│                                        │
│ CONTENT TYPE                           │
│ • contentType (code, prose, data)      │
│ • isCode, programmingLanguage          │
│                                        │
│ CODE-SPECIFIC                          │
│ • syntaxHighlightingLanguage           │
│ • linesOfCode, commentLines            │
│ • blankLines                           │
│                                        │
│ MARKDOWN-SPECIFIC                      │
│ • isMarkdown                           │
│ • markdownHeadings (JSONB array)       │
│ • markdownLinks (JSONB array)          │
│                                        │
│ JSON-SPECIFIC                          │
│ • isJSON, jsonValid                    │
│ • jsonSchema (JSONB)                   │
│                                        │
│ CSV-SPECIFIC                           │
│ • isCSV, csvDelimiter                  │
│ • csvHeaderRow                         │
│ • csvColumns (JSONB array)             │
│ • csvRowCount                          │
│                                        │
│ XML/HTML-SPECIFIC                      │
│ • isXML, isHTML                        │
│ • xmlValid, htmlValid                  │
│                                        │
│ CONTENT PREVIEW                        │
│ • preview, previewLength               │
│                                        │
│ FULL-TEXT SEARCH                       │
│ • fullText                             │
│ • searchVector (PostgreSQL tsvector)   │
│                                        │
│ PROCESSING                             │
│ • isProcessed                          │
│ • processingStartedAt                  │
│ • processingCompletedAt                │
│ • processingError                      │
│                                        │
│ ANALYSIS                               │
│ • readingTime (seconds)                │
│ • complexity (readability score)       │
│ • sentiment, sentimentScore            │
│                                        │
│ KEYWORDS & TOPICS                      │
│ • keywords (JSONB array)               │
│ • topics (JSONB array)                 │
│                                        │
│ METADATA                               │
│ • title, description, author           │
│                                        │
│ COPYRIGHT                              │
│ • copyright, license                   │
└────────────────────────────────────────┘
```

## Key Statistics

| Table | Columns | Key Features |
|-------|---------|-------------|
| **file** | 26 | Generic metadata, discriminator, versioning |
| **imageFile** | 48 | EXIF data, thumbnails, image analysis |
| **videoFile** | 60 | **Processing tracking**, transcoding, streaming |
| **audioFile** | 54 | Music metadata, waveform, audio analysis |
| **textFile** | 54 | Content analysis, format detection, search |

**Total**: 242 columns across 5 tables

## Usage Pattern

```typescript
// When type = 'video'
file.contentId ──► videoFile.id

// When type = 'image'
file.contentId ──► imageFile.id

// When type = 'audio'
file.contentId ──► audioFile.id

// When type = 'text'
file.contentId ──► textFile.id
```

## Processing Workflow Example (Video)

```
┌──────────────┐
│ Upload Video │
└──────┬───────┘
       │
       ▼
┌─────────────────────┐
│ Create videoFile    │
│ isProcessed: false  │
└──────┬──────────────┘
       │
       ▼
┌────────────────────────────┐
│ Start Processing           │
│ processingStartedAt: now() │
│ processingProgress: 0      │
└──────┬─────────────────────┘
       │
       ▼
┌────────────────────────────┐
│ Update Progress            │
│ processingProgress: 50     │
└──────┬─────────────────────┘
       │
       ▼
┌────────────────────────────┐
│ Complete Processing        │
│ isProcessed: true          │
│ processingCompletedAt: now()│
│ processingProgress: 100    │
└────────────────────────────┘
```

## Benefits of This Schema

✅ **Comprehensive**: Handles virtually all file metadata scenarios  
✅ **Type-Safe**: Discriminated union enables TypeScript inference  
✅ **Flexible**: Easy to add new file types  
✅ **Efficient**: Avoids sparse tables with many NULL values  
✅ **Searchable**: Rich metadata enables powerful queries  
✅ **Trackable**: Complete processing status history  
✅ **Versionable**: Built-in file versioning support  
✅ **Secure**: Access control with permissions  
✅ **Auditable**: Soft delete and deletion tracking  

## Migration

```bash
# Apply the migration
bun run db:push

# Or run specific migration
bun run db:migrate
```

Migration file: `0014_purple_slapstick.sql`
