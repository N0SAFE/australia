import { Module } from '@nestjs/common';
import { InvitationController } from './controllers/invitation.controller';
import { InvitationService } from './services/invitation.service';
import { InvitationRepository } from './repositories/invitation.repository';
import { UserModule } from '../user/user.module';

@Module({
  imports: [UserModule],
  controllers: [InvitationController],
  providers: [InvitationService, InvitationRepository],
  exports: [InvitationService, InvitationRepository],
})
export class InvitationModule {}
