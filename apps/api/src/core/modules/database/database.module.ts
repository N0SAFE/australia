import { Module, Global } from "@nestjs/common";
import { DatabaseService } from "./services/database.service";
import { DATABASE_CONNECTION } from "./database-connection";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../../../config/drizzle/schema";
import { EnvService } from "../../../config/env/env.service";
import { EnvModule } from "../../../config/env/env.module";

@Global()
@Module({
    imports: [EnvModule],
    providers: [
        DatabaseService,
        {
            provide: DATABASE_CONNECTION,
            useFactory: (envService: EnvService) => {
                const databaseUrl = envService.get('DATABASE_URL');
                console.log('🔍 DATABASE_URL:', databaseUrl);
                const pool = new Pool({
                    connectionString: databaseUrl
                });
                return drizzle(pool, {
                    schema: schema
                });
            },
            inject: [EnvService]
        }
    ],
    exports: [DatabaseService, DATABASE_CONNECTION]
})
export class DatabaseModule {}
