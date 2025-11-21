import { Controller } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';
import { capsuleContract } from '@repo/api-contracts';
import { CapsuleService } from '../services/capsule.service';
import { AllowAnonymous, Session as SessionDecorator } from '../../../core/modules/auth/decorators/decorators';
import type { Session } from '@repo/auth';

@Controller()
export class CapsuleController {
  constructor(private readonly capsuleService: CapsuleService) {}

  @AllowAnonymous()
  @Implement(capsuleContract.list)
  list() {
    return implement(capsuleContract.list).handler(async ({ input }) => {
      const result = await this.capsuleService.getCapsules(input);
      console.log(result)
      return result;
    });
  }

  // IMPORTANT: Specific routes (/month, /day, /recent) must come BEFORE wildcard routes (/:id)
  // to prevent the wildcard from matching "month", "day", or "recent" as an ID
  
  @AllowAnonymous()
  @Implement(capsuleContract.getRecent)
  getRecent() {
    return implement(capsuleContract.getRecent).handler(async () => {
      return await this.capsuleService.getRecentCapsules();
    });
  }

  @AllowAnonymous()
  @Implement(capsuleContract.findByMonth)
  findByMonth() {
    return implement(capsuleContract.findByMonth).handler(async ({ input }) => {
      try {
        const validInput = input as { month: string };
        const result = await this.capsuleService.getCapsulesForMonth(validInput.month);
        
        // Log all capsules to see the data structure
        console.error('[Controller] ALL CAPSULES DATA:');
        result.capsules.forEach((cap: any, idx: number) => {
          console.error(`\n[Controller] === Capsule ${String(idx)} ===`);
          console.error(JSON.stringify(cap, null, 2));
        });
        
        // Test validation
        const { capsuleFindByMonthOutput } = await import('@repo/api-contracts/modules/capsule/findByMonth');
        try {
          capsuleFindByMonthOutput.parse(result);
          console.error('[Controller] ✅ Validation SUCCESS');
        } catch (validationError: unknown) {
          console.error('[Controller] ❌ Validation FAILED');
          if (validationError instanceof Error) {
            console.error('[Controller] Error:', validationError.message);
            if ('issues' in validationError && validationError.issues) {
              console.error('[Controller] Issues:', JSON.stringify(validationError.issues, null, 2));
            }
          }
        }
        
        return result;
      } catch (error) {
        console.error('[Controller] EXCEPTION:', error);
        throw error;
      }
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
      return capsule;
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
      return capsule;
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

  @Implement(capsuleContract.unlock)
  unlock(@SessionDecorator() session: Session) {
    return implement(capsuleContract.unlock).handler(async ({ input }) => {
      const validInput = input as {
        id: string;
        code?: string;
        voiceTranscript?: string;
        deviceAction?: 'shake' | 'tilt' | 'tap';
        apiResponse?: unknown;
      };
      
      // Extract user from session
      const user = session.user;
      
      const result = await this.capsuleService.unlockCapsule(validInput, user);
      
      // Convert null to undefined for contract compatibility
      return {
        success: result.success,
        message: result.message,
        capsule: result.capsule === null ? undefined : result.capsule,
      };
    });
  }

  @AllowAnonymous()
  @Implement(capsuleContract.markAsOpened)
  markAsOpened(@SessionDecorator() session: Session | null) {
    return implement(capsuleContract.markAsOpened).handler(async ({ input }) => {
      const validInput = input as { id: string };
      
      // Extract user from session
      const user = session?.user;
      
      const result = await this.capsuleService.markCapsuleAsOpened(validInput.id, user);
      
      // Convert null to undefined for contract compatibility
      return {
        success: result.success,
        message: result.message,
        capsule: result.capsule === null ? undefined : result.capsule,
      };
    });
  }
}
