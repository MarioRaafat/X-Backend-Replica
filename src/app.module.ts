import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PostgreSQLModule } from './databases/postgresql.module';
import { RedisModuleConfig } from './redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: "config/.env"
    }),
    PostgreSQLModule,
    RedisModuleConfig
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
