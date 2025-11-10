# Seed Assets

This directory contains sample media files used for database seeding.

## Contents

- **images/**: Sample images from Unsplash (small 800px width)
  - `mountain-sunset.jpg` (~64KB)
  - `forest-trail.jpg` (~56KB)
  - `ocean-waves.jpg` (~44KB)

- **videos/**: Sample videos from Google's sample videos
  - `big-buck-bunny.mp4` (~151MB)
  - `elephants-dream.mp4` (~162MB)
  - `for-bigger-blazes.mp4` (~2.4MB)

- **audio/**: Sample audio files from SoundHelix
  - `soundhelix-song-1.mp3` (~8.6MB)
  - `soundhelix-song-2.mp3` (~9.8MB)

## Setup

To download all assets, run:

```bash
./download-assets.sh
```

This will download all sample files from their original sources.

## Usage

The seed command (`bun run seed`) will copy these files to the `uploads/` directory with unique filenames, allowing fast database seeding without downloading files each time.

## Total Size

- Images: ~164KB
- Videos: ~315MB
- Audio: ~18MB
- **Total: ~333MB**

## Notes

- Video files are large but are only downloaded once
- Files are copied (not moved) during seeding, so they can be reused
- You can delete the `videos/` folder if you want to skip video seeding and reduce the asset size to ~18MB
