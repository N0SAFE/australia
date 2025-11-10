import { oc } from "@orpc/contract";

// Import all contract definitions
import { capsuleListContract } from './list';
import { capsuleFindByIdContract } from './findById';
import { capsuleFindByDayContract } from './findByDay';
import { capsuleFindByMonthContract } from './findByMonth';
import { capsuleCreateContract } from './create';
import { capsuleUpdateContract } from './update';
import { capsuleDeleteContract } from './delete';
import { capsuleUnlockContract } from './unlock';

// Combine into main capsule contract
export const capsuleContract = oc.tag("Capsule").prefix("/capsule").router({
  list: capsuleListContract,
  findById: capsuleFindByIdContract,
  findByDay: capsuleFindByDayContract,
  findByMonth: capsuleFindByMonthContract,
  create: capsuleCreateContract,
  update: capsuleUpdateContract,
  delete: capsuleDeleteContract,
  unlock: capsuleUnlockContract,
});

export type CapsuleContract = typeof capsuleContract;

// Re-export everything from individual contracts
export * from './list';
export * from './findById';
export * from './findByDay';
export * from './findByMonth';
export * from './create';
export * from './update';
export * from './delete';
export * from './unlock';
