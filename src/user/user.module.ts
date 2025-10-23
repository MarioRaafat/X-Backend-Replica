import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserBlocks, UserFollows, UserMutes } from './entities';
import { UserInterests } from './entities/user-interests.entity';

@Module({
    imports: [TypeOrmModule.forFeature([User, UserFollows, UserBlocks, UserMutes, UserInterests])],
    controllers: [UserController],
    providers: [UserService],
})
export class UserModule {}
