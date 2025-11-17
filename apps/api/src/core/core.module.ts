import { Module } from "@nestjs/common";
import { AuthModule } from "./modules/auth/auth.module";
import { DatabaseModule } from "./modules/database/database.module";
import { FfmpegModule } from "./modules/ffmpeg/ffmpeg.module";

@Module({
    imports: [FfmpegModule],
    providers: [AuthModule, DatabaseModule],
    exports: [AuthModule, DatabaseModule, FfmpegModule],
})
export class CoreModule {}
