import { oc } from '@orpc/contract';

// Import all contract definitions
import { uploadImageContract } from './uploadImage';
import { uploadVideoContract } from './uploadVideo';
import { uploadAudioContract } from './uploadAudio';
import { getFileContract } from './getFile';
import { subscribeVideoProcessingContract } from './subscribeVideoProcessing';

// Combine into main storage contract
export const storageContract = oc.tag('Storage').prefix('/storage').router({
  uploadImage: uploadImageContract,
  uploadVideo: uploadVideoContract,
  uploadAudio: uploadAudioContract,
  getFile: getFileContract,
  subscribeVideoProcessing: subscribeVideoProcessingContract,
});

export type StorageContract = typeof storageContract;

// Re-export everything from individual contracts
export * from './uploadImage';
export * from './uploadVideo';
export * from './uploadAudio';
export * from './getFile';
export * from './subscribeVideoProcessing';
