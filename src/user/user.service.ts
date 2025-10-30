import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { UserProfileDto } from './dto/user-profile.dto';
import { plainToInstance } from 'class-transformer';
import { ERROR_MESSAGES } from 'src/constants/swagger-messages';
import { SelectQueryBuilder } from 'typeorm/browser';
import { DetailedUserProfileDto } from './dto/detailed-user-profile.dto';
import { MutualFollowerDto } from './dto/mutual-follower.dto';
import { GetFollowersDto } from './dto/get-followers.dto';
import { UserListItemDto } from './dto/user-list-item.dto';
import { PaginationParamsDto } from './dto/pagination-params.dto';
import { UserRepository } from './user.repository';

@Injectable()
export class UserService {
    constructor(private readonly user_repository: UserRepository) {}

    async getMe(user_id: string): Promise<UserProfileDto> {
        const result = await this.user_repository
            .buildProfileQuery(user_id, 'id')
            .getRawOne<UserProfileDto>();

        if (!result) {
            throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
        }

        return plainToInstance(UserProfileDto, result, {
            enableImplicitConversion: true,
        });
    }

    async getUserById(
        current_user_id: string | null,
        target_user_id: string
    ): Promise<DetailedUserProfileDto> {
        const result = await this.user_repository
            .buildProfileQuery(target_user_id, 'id', current_user_id)
            .getRawOne<DetailedUserProfileDto>();

        if (!result) {
            throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
        }

        return plainToInstance(DetailedUserProfileDto, result, {
            enableImplicitConversion: true,
        });
    }

    async getUserByUsername(
        current_user_id: string | null,
        target_username: string
    ): Promise<DetailedUserProfileDto> {
        const result = await this.user_repository
            .buildProfileQuery(target_username, 'username', current_user_id)
            .getRawOne<DetailedUserProfileDto>();

        if (!result) {
            throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
        }

        return plainToInstance(DetailedUserProfileDto, result, {
            enableImplicitConversion: true,
        });
    }

    async getFollowers(
        current_user_id: string,
        target_user_id: string,
        query_dto: GetFollowersDto
    ): Promise<UserListItemDto[]> {
        const { page_offset, page_size, following } = query_dto;

        const results = await this.user_repository.getFollowersList(
            current_user_id,
            target_user_id,
            page_offset,
            page_size,
            following
        );

        const users = results.map((result) =>
            plainToInstance(UserListItemDto, result, {
                enableImplicitConversion: true,
            })
        );

        return users;
    }

    async getFollowing(
        current_user_id: string,
        target_user_id: string,
        query_dto: PaginationParamsDto
    ): Promise<UserListItemDto[]> {
        const { page_offset, page_size } = query_dto;

        const results = await this.user_repository.getFollowingList(
            current_user_id,
            target_user_id,
            page_offset,
            page_size
        );
        const users = results.map((result) =>
            plainToInstance(UserListItemDto, result, {
                enableImplicitConversion: true,
            })
        );

        return users;
    }

    async getMutedList(
        current_user_id: string,
        query_dto: PaginationParamsDto
    ): Promise<UserListItemDto[]> {
        const { page_offset, page_size } = query_dto;

        const results = await this.user_repository.getMutedUsersList(
            current_user_id,
            page_offset,
            page_size
        );

        const users = results.map((result) =>
            plainToInstance(UserListItemDto, result, {
                enableImplicitConversion: true,
            })
        );

        return users;
    }

    async getBlockedList(
        current_user_id: string,
        query_dto: PaginationParamsDto
    ): Promise<UserListItemDto[]> {
        const { page_offset, page_size } = query_dto;

        const results = await this.user_repository.getBlockedUsersList(
            current_user_id,
            page_offset,
            page_size
        );

        const users = results.map((result) =>
            plainToInstance(UserListItemDto, result, {
                enableImplicitConversion: true,
            })
        );

        return users;
    }

    async followUser(current_user_id: string, target_user_id: string) {}
}
