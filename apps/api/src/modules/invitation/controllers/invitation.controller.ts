import { Controller } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';
import { invitationContract } from '@repo/api-contracts';
import { InvitationService } from '../services/invitation.service';
import { AllowAnonymous, RequireRole } from '@/core/modules/auth/decorators/decorators';

@Controller()
export class InvitationController {
  constructor(private readonly invitationService: InvitationService) {}

  @RequireRole('admin')
  @Implement(invitationContract.create)
  create() {
    return implement(invitationContract.create).handler(async ({ input }) => {
      return await this.invitationService.createInvitation(input.email, input.role);
    });
  }

  @AllowAnonymous()
  @Implement(invitationContract.check)
  check() {
    return implement(invitationContract.check).handler(async ({ input }) => {
      return await this.invitationService.checkInvitation(input.token);
    });
  }

  @AllowAnonymous()
  @Implement(invitationContract.validate)
  validate() {
    return implement(invitationContract.validate).handler(async ({ input }) => {
      return await this.invitationService.validateInvitation(
        input.token,
        input.password,
        input.name,
      );
    });
  }
}
