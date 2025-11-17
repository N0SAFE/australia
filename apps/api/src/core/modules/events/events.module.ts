import { Module, Global } from '@nestjs/common';
import { EventBridgeService } from './event-bridge.service';

@Global()
@Module({
  providers: [EventBridgeService],
  exports: [EventBridgeService],
})
export class EventsModule {}
