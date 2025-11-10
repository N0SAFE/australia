import { oc } from "@orpc/contract";

// Import all contract definitions
import { invitationCreateContract } from './create';
import { invitationValidateContract } from './validate';
import { invitationCheckContract } from './check';

// Combine into main invitation contract
export const invitationContract = oc.tag("Invitation").prefix("/invitation").router({
  create: invitationCreateContract,
  validate: invitationValidateContract,
  check: invitationCheckContract,
});

export type InvitationContract = typeof invitationContract;

// Re-export everything from individual contracts
export * from './create';
export * from './validate';
export * from './check';
