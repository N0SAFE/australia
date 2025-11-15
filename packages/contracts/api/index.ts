import { oc } from "@orpc/contract";
import { userContract, healthContract, capsuleContract, storageContract, invitationContract, presentationContract } from "./modules/index";

// Main app contract that combines all feature contracts
export const appContract = oc.router({
  user: userContract,
  health: healthContract,
  capsule: capsuleContract,
  storage: storageContract,
  invitation: invitationContract,
  presentation: presentationContract,
});

export type AppContract = typeof appContract;

// Re-export individual contracts and schemas
export * from "./modules/index";
