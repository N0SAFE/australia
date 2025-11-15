import { oc } from '@orpc/contract';

// Import all contract definitions
import { presentationUploadContract } from './upload';
import { presentationGetCurrentContract } from './getCurrent';
import { presentationGetVideoContract } from './getVideo';
import { presentationDeleteContract } from './deleteVideo';

// Combine into main presentation contract
export const presentationContract = oc.tag('Presentation').prefix('/presentation').router({
  upload: presentationUploadContract,
  getCurrent: presentationGetCurrentContract,
  getVideo: presentationGetVideoContract,
  delete: presentationDeleteContract,
});

export type PresentationContract = typeof presentationContract;

// Re-export everything from individual contracts
export * from './upload';
export * from './getCurrent';
export * from './getVideo';
export * from './deleteVideo';
