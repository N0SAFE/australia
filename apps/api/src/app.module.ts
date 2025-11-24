import {
  type MiddlewareConsumer,
  Module,
  type NestModule,
} from "@nestjs/common";
import { DatabaseModule } from "./core/modules/database/database.module";
import { HealthModule } from "./modules/health/health.module";
import { UserModule } from "./modules/user/user.module";
import { CapsuleModule } from "./modules/capsule/capsule.module";
import { InvitationModule } from "./modules/invitation/invitation.module";
import { onError, ORPCModule } from "@orpc/nest";
import { ResponseHeadersPlugin } from "@orpc/server/plugins";
import { DATABASE_CONNECTION } from "./core/modules/database/database-connection";
import { AuthModule } from "./core/modules/auth/auth.module";
import { LoggerMiddleware } from "./core/middlewares/logger.middleware";
import { createBetterAuth } from "./config/auth/auth";
import { EnvService } from "./config/env/env.service";
import { EnvModule } from "./config/env/env.module";
import { APP_GUARD } from "@nestjs/core";
import { AuthGuard } from "./core/modules/auth/guards/auth.guard";
import { RoleGuard } from "./core/modules/auth/guards/role.guard";
import { REQUEST } from '@nestjs/core'
import { StorageModule } from "./modules/storage/storage.module";
import { PresentationModule } from "./modules/presentation/presentation.module";
import { FfmpegModule } from "./core/modules/ffmpeg/ffmpeg.module";
import { EventsModule } from "./core/modules/events/events.module";

@Module({
  imports: [
    EnvModule,
    DatabaseModule,
    EventsModule,
    FfmpegModule,
    AuthModule.forRootAsync({
      imports: [DatabaseModule, EnvModule],
      useFactory: createBetterAuth,
      inject: [DATABASE_CONNECTION, EnvService],
      disableBodyParser: false,
    }),
    HealthModule,
    UserModule,
    CapsuleModule,
    InvitationModule,
    StorageModule,
    PresentationModule, 
    ORPCModule.forRootAsync({
      useFactory: (request: Request) => ({
        interceptors: [
          onError((error, _ctx) => {
            console.error(  
              "oRPC Error:",
              JSON.stringify(error)
            );
          })
        ],
        plugins: [
          new ResponseHeadersPlugin(),
        ],
        context: { request },
        eventIteratorKeepAliveInterval: 5000, // 5 seconds
      }),
      inject: [REQUEST],
    }),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RoleGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes("*");
  }
}
