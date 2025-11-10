#!/bin/bash

# Script to download sample media files for seeding

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ASSETS_DIR="$SCRIPT_DIR/assets"

echo "📥 Downloading sample media files for seeding..."

# Create directories
mkdir -p "$ASSETS_DIR/images"
mkdir -p "$ASSETS_DIR/videos"
mkdir -p "$ASSETS_DIR/audio"

# Download images from Unsplash (small sizes for faster seeding)
echo "🖼️  Downloading images..."
curl -L "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80" -o "$ASSETS_DIR/images/mountain-sunset.jpg"
curl -L "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80" -o "$ASSETS_DIR/images/forest-trail.jpg"
curl -L "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=800&q=80" -o "$ASSETS_DIR/images/ocean-waves.jpg"

# Download sample videos (small clips)
echo "🎬 Downloading videos..."
curl -L "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" -o "$ASSETS_DIR/videos/big-buck-bunny.mp4"
curl -L "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4" -o "$ASSETS_DIR/videos/elephants-dream.mp4"
curl -L "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" -o "$ASSETS_DIR/videos/for-bigger-blazes.mp4"

# Download sample audio files
echo "🎵 Downloading audio files..."
curl -L "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" -o "$ASSETS_DIR/audio/soundhelix-song-1.mp3"
curl -L "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" -o "$ASSETS_DIR/audio/soundhelix-song-2.mp3"

echo "✅ All sample media files downloaded successfully!"
echo ""
echo "📊 Summary:"
echo "Images: $(ls -1 "$ASSETS_DIR/images" | wc -l) files"
echo "Videos: $(ls -1 "$ASSETS_DIR/videos" | wc -l) files"
echo "Audio: $(ls -1 "$ASSETS_DIR/audio" | wc -l) files"
