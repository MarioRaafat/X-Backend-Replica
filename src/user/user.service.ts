import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
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
import { UserFollows } from './entities';
import { RelationshipType } from './enums/relationship-type.enum';

@Injectable()
export class UserService {
    constructor(private readonly user_repository: UserRepository) {}

    async getMe(user_id: string): Promise<UserProfileDto> {
        const result = await this.user_repository
            .buildProfileQuery(user_id, 'id')
            .getRawOne<UserProfileDto>();

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

    async followUser(current_user_id: string, target_user_id: string): Promise<void> {
        if (current_user_id === target_user_id) {
            throw new BadRequestException(ERROR_MESSAGES.CANNOT_FOLLOW_YOURSELF);
        }
        const [validation_result, follow_permissions] = await Promise.all([
            this.user_repository.validateRelationshipRequest(
                current_user_id,
                target_user_id,
                RelationshipType.FOLLOW
            ),
            this.user_repository.verifyFollowPermissions(current_user_id, target_user_id),
        ]);

        if (!validation_result || !validation_result.user_exists) {
            throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
        }

        if (validation_result.relationship_exists) {
            throw new ConflictException(ERROR_MESSAGES.ALREADY_FOLLOWING);
        }

        if (follow_permissions.blocked_me) {
            throw new ForbiddenException(ERROR_MESSAGES.CANNOT_FOLLOW_USER);
        }

        if (follow_permissions.is_blocked) {
            throw new BadRequestException(ERROR_MESSAGES.CANNOT_FOLLOW_BLOCKED_USER);
        }

        await this.user_repository.insertFollowRelationship(current_user_id, target_user_id);
    }

    async unfollowUser(current_user_id: string, target_user_id: string): Promise<void> {
        if (current_user_id === target_user_id) {
            throw new BadRequestException(ERROR_MESSAGES.CANNOT_UNFOLLOW_YOURSELF);
        }

        const validation_result = await this.user_repository.validateRelationshipRequest(
            current_user_id,
            target_user_id,
            RelationshipType.FOLLOW
        );

        if (!validation_result || !validation_result.user_exists) {
            throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
        }

        if (!validation_result.relationship_exists) {
            throw new ConflictException(ERROR_MESSAGES.NOT_FOLLOWED);
        }

        await this.user_repository.deleteFollowRelationship(current_user_id, target_user_id);
    }

    async muteUser(current_user_id: string, target_user_id: string): Promise<void> {
        if (current_user_id === target_user_id) {
            throw new BadRequestException(ERROR_MESSAGES.CANNOT_MUTE_YOURSELF);
        }

        const validation_result = await this.user_repository.validateRelationshipRequest(
            current_user_id,
            target_user_id,
            RelationshipType.MUTE
        );

        if (!validation_result || !validation_result.user_exists) {
            throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
        }

        if (validation_result.relationship_exists) {
            throw new ConflictException(ERROR_MESSAGES.ALREADY_MUTED);
        }

        await this.user_repository.insertMuteRelationship(current_user_id, target_user_id);
    }

    async unmuteUser(current_user_id: string, target_user_id: string): Promise<void> {
        if (current_user_id === target_user_id) {
            throw new BadRequestException(ERROR_MESSAGES.CANNOT_UNMUTE_YOURSELF);
        }

        const validation_result = await this.user_repository.validateRelationshipRequest(
            current_user_id,
            target_user_id,
            RelationshipType.MUTE
        );

        if (!validation_result || !validation_result.user_exists) {
            throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
        }

        if (!validation_result.relationship_exists) {
            throw new ConflictException(ERROR_MESSAGES.NOT_MUTED);
        }

        await this.user_repository.deleteMuteRelationship(current_user_id, target_user_id);
    }

    async blockUser(current_user_id: string, target_user_id: string): Promise<void> {
        if (current_user_id === target_user_id) {
            throw new BadRequestException(ERROR_MESSAGES.CANNOT_BLOCK_YOURSELF);
        }

        const validation_result = await this.user_repository.validateRelationshipRequest(
            current_user_id,
            target_user_id,
            RelationshipType.BLOCK
        );

        if (!validation_result || !validation_result.user_exists) {
            throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
        }

        if (validation_result.relationship_exists) {
            throw new ConflictException(ERROR_MESSAGES.ALREADY_BLOCKED);
        }

        await this.user_repository.insertBlockRelationship(current_user_id, target_user_id);
    }

    async unblockUser(current_user_id: string, target_user_id: string): Promise<void> {
        if (current_user_id === target_user_id) {
            throw new BadRequestException(ERROR_MESSAGES.CANNOT_UNBLOCK_YOURSELF);
        }

        const validation_result = await this.user_repository.validateRelationshipRequest(
            current_user_id,
            target_user_id,
            RelationshipType.BLOCK
        );

        if (!validation_result || !validation_result.user_exists) {
            throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
        }

        if (!validation_result.relationship_exists) {
            throw new ConflictException(ERROR_MESSAGES.NOT_BLOCKED);
        }

        await this.user_repository.deleteBlockRelationship(current_user_id, target_user_id);
    }
}
