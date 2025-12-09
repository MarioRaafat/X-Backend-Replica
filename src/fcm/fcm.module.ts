import { Module } from '@nestjs/common';
import { FCMService } from './fcm.service';
import { FcmController } from './fcm.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/user/entities';

@Module({
    imports: [TypeOrmModule.forFeature([User])],
    providers: [FCMService],
    controllers: [FcmController],
    exports: [FCMService],
})
export class FcmModule {}
