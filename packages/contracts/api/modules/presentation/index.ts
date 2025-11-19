import { oc } from '@orpc/contract';

// Import all contract definitions
import { presentationUploadContract } from './upload';
import { presentationGetCurrentContract } from './getCurrent';
import { presentationGetVideoContract } from './getVideo';
import { presentationDeleteContract } from './deleteVideo';
import { presentationSubscribeProcessingProgressContract } from './subscribeProcessingProgress';

// Combine into main presentation contract
export const presentationContract = oc.tag('Presentation').prefix('/presentation').router({
  upload: presentationUploadContract,
  getCurrent: presentationGetCurrentContract,
  getVideo: presentationGetVideoContract,
  delete: presentationDeleteContract,
  subscribeProcessingProgress: presentationSubscribeProcessingProgressContract,
});

export type PresentationContract = typeof presentationContract;

// Re-export everything from individual contracts
export * from './upload';
export * from './getCurrent';
export * from './getVideo';
export * from './deleteVideo';
export * from './subscribeProcessingProgress';
