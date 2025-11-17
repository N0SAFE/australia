#!/usr/bin/env bun
/**
 * FFmpeg Availability Test Script
 * Run this inside the Docker container to verify FFmpeg installation
 * 
 * Usage: bun scripts/test-ffmpeg.ts
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function testFfmpegAvailability() {
  console.log('🔍 Testing FFmpeg availability...\n');

  try {
    // Test if ffmpeg is in PATH
    const { stdout: ffmpegVersion } = await execAsync('ffmpeg -version');
    console.log('✅ FFmpeg is installed');
    console.log('Version info:');
    console.log(ffmpegVersion.split('\n')[0]);
    console.log('');

    // Test if ffprobe is available (used for metadata)
    const { stdout: ffprobeVersion } = await execAsync('ffprobe -version');
    console.log('✅ FFprobe is installed');
    console.log('Version info:');
    console.log(ffprobeVersion.split('\n')[0]);
    console.log('');

    // Check for H.264 encoder
    const { stdout: encoders } = await execAsync('ffmpeg -encoders 2>&1 | grep h264');
    if (encoders.includes('libx264')) {
      console.log('✅ H.264 encoder (libx264) is available');
    } else {
      console.log('⚠️  H.264 encoder (libx264) not found');
    }
    console.log('');

    // Check for AAC encoder
    const { stdout: aacEncoders } = await execAsync('ffmpeg -encoders 2>&1 | grep aac');
    if (aacEncoders.includes('aac')) {
      console.log('✅ AAC audio encoder is available');
    } else {
      console.log('⚠️  AAC audio encoder not found');
    }
    console.log('');

    console.log('✨ All FFmpeg checks passed! Video conversion should work.');
    process.exit(0);
  } catch (error) {
    console.error('❌ FFmpeg is not available or not properly installed');
    console.error('Error:', (error as Error).message);
    console.log('\nTo install FFmpeg in Alpine Linux:');
    console.log('  apk add --no-cache ffmpeg');
    process.exit(1);
  }
}

testFfmpegAvailability();
