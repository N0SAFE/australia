import { oc } from '@orpc/contract';

// Import all contract definitions
import { uploadImageContract } from './uploadImage';
import { uploadVideoContract } from './uploadVideo';
import { uploadAudioContract } from './uploadAudio';
import { getRawFileContract } from './getRawFile';
import { getImageFileContract } from './getImageFile';
import { getAudioFileContract } from './getAudioFile';
import { subscribeVideoProcessingContract } from './subscribeVideoProcessing';
import { getVideoFileContract } from './getVideoFile';
import { getImageDataContract } from './getImageData';
import { getAudioDataContract } from './getAudioData';
import { getVideoDataContract } from './getVideoData';
import { getRawFileDataContract } from './getRawData';

// Combine into main storage contract
export const storageContract = oc.tag('Storage').prefix('/storage').router({
  uploadImage: uploadImageContract,
  uploadVideo: uploadVideoContract,
  uploadAudio: uploadAudioContract,
  getImage: getImageFileContract,
  getAudio: getAudioFileContract,
  getRawFile: getRawFileContract,
  getVideo: getVideoFileContract,
  getImageData: getImageDataContract,
  getAudioData: getAudioDataContract,
  getVideoData: getVideoDataContract,
  getRawFileData: getRawFileDataContract,
  subscribeVideoProcessing: subscribeVideoProcessingContract,
});

export type StorageContract = typeof storageContract;

// Re-export everything from individual contracts
export * from './uploadImage';
export * from './uploadVideo';
export * from './uploadAudio';
export * from './getRawFile';
export * from './getImageFile';
export * from './getAudioFile';
export * from './subscribeVideoProcessing';
export * from './getVideoFile';
