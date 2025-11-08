import { Controller, Logger } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';
import { capsuleContract } from '@repo/api-contracts';
import { CapsuleService } from '../services/capsule.service';
import { AllowAnonymous } from '../../../core/modules/auth/decorators/decorators';

@Controller()
export class CapsuleController {
  constructor(private readonly capsuleService: CapsuleService) {}

  @AllowAnonymous()
  @Implement(capsuleContract.list)
  list() {
    return implement(capsuleContract.list).handler(async ({ input }) => {
      const result = await this.capsuleService.getCapsules(input);
      return {
        capsules: result.capsules.map(capsule => ({
          id: capsule.id,
          openingDate: capsule.openingDate,
          content: capsule.content,
          openingMessage: capsule.openingMessage,
          createdAt: capsule.createdAt,
          updatedAt: capsule.updatedAt,
        })),
        meta: result.meta,
      };
    });
  }

  // IMPORTANT: Specific routes (/month, /day) must come BEFORE wildcard routes (/:id)
  // to prevent the wildcard from matching "month" or "day" as an ID
  
  @AllowAnonymous()
  @Implement(capsuleContract.findByMonth)
  findByMonth() {
    return implement(capsuleContract.findByMonth).handler(async ({ input }) => {
      const validInput = input as { month: string };
      const result = await this.capsuleService.getCapsulesForMonth(validInput.month);
      return result;
    });
  }

  @AllowAnonymous()
  @Implement(capsuleContract.findByDay)
  findByDay() {
    return implement(capsuleContract.findByDay).handler(async ({ input }) => {
      const validInput = input as { day: string };
      return await this.capsuleService.getCapsulesByDay(validInput.day);
    });
  }

  @AllowAnonymous()
  @Implement(capsuleContract.findById)
  findById() {
    return implement(capsuleContract.findById).handler(async ({ input }) => {
      const validInput = input as { id: string };
      return await this.capsuleService.findCapsuleById(validInput.id);
    });
  }

  @Implement(capsuleContract.create)
  create() {
    return implement(capsuleContract.create).handler(async ({ input }) => {
      const capsule = await this.capsuleService.createCapsule(input);
      if (!capsule) {
        throw new Error('Failed to create capsule');
      }
      return {
        id: capsule.id,
        openingDate: capsule.openingDate,
        content: capsule.content,
        openingMessage: capsule.openingMessage,
        createdAt: capsule.createdAt,
        updatedAt: capsule.updatedAt,
      };
    });
  }

  @Implement(capsuleContract.update)
  update() {
    return implement(capsuleContract.update).handler(async ({ input }) => {
      const validInput = input as { id: string; openingDate?: string; content?: string; openingMessage?: string };
      const capsule = await this.capsuleService.updateCapsule(validInput.id, validInput);
      if (!capsule) {
        throw new Error('Capsule not found');
      }
      return {
        id: capsule.id,
        openingDate: capsule.openingDate,
        content: capsule.content,
        openingMessage: capsule.openingMessage,
        createdAt: capsule.createdAt,
        updatedAt: capsule.updatedAt,
      };
    });
  }

  @Implement(capsuleContract.delete)
  delete() {
    return implement(capsuleContract.delete).handler(async ({ input }) => {
      const validInput = input as { id: string };
      const capsule = await this.capsuleService.deleteCapsule(validInput.id);
      if (!capsule) {
        return { success: false };
      }
      return { success: true };
    });
  }
}
