import { Module } from '@nestjs/common';
import { FCMService } from './expo.service';
import { FcmController } from './expo.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/user/entities';

@Module({
    imports: [TypeOrmModule.forFeature([User])],
    providers: [FCMService],
    controllers: [FcmController],
    exports: [FCMService],
})
export class FcmModule {}
