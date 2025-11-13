import { oc } from "@orpc/contract";

// Import all contract definitions
import { capsuleListContract } from './list';
import { capsuleFindByIdContract } from './findById';
import { capsuleFindByDayContract } from './findByDay';
import { capsuleFindByMonthContract } from './findByMonth';
import { capsuleGetRecentContract } from './getRecent';
import { capsuleCreateContract } from './create';
import { capsuleUpdateContract } from './update';
import { capsuleDeleteContract } from './delete';
import { capsuleUnlockContract } from './unlock';
import { capsuleMarkAsOpenedContract } from './markAsOpened';

// Combine into main capsule contract
export const capsuleContract = oc.tag("Capsule").prefix("/capsule").router({
  list: capsuleListContract,
  findById: capsuleFindByIdContract,
  findByDay: capsuleFindByDayContract,
  findByMonth: capsuleFindByMonthContract,
  getRecent: capsuleGetRecentContract,
  create: capsuleCreateContract,
  update: capsuleUpdateContract,
  delete: capsuleDeleteContract,
  unlock: capsuleUnlockContract,
  markAsOpened: capsuleMarkAsOpenedContract,
});

export type CapsuleContract = typeof capsuleContract;

// Re-export everything from individual contracts
export * from './list';
export * from './findById';
export * from './findByDay';
export * from './findByMonth';
export * from './getRecent';
export * from './create';
export * from './update';
export * from './delete';
export * from './unlock';
export * from './markAsOpened';
