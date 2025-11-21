import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { In, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { UserProfileDto } from './dto/user-profile.dto';
import { instanceToInstance, plainToInstance } from 'class-transformer';
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
import { UpdateUserDto } from './dto/update-user.dto';
import { GetUsersByIdDto } from './dto/get-users-by-id.dto';
import { GetUsersByUsernameDto } from './dto/get-users-by-username.dto';
import { UserLookupDto } from './dto/user-lookup.dto';
import { AzureStorageService } from 'src/azure-storage/azure-storage.service';
import { ConfigService } from '@nestjs/config';
import { AssignInterestsDto } from './dto/assign-interests.dto';
import { Category } from 'src/category/entities';
import { ChangeLanguageDto } from './dto/change-language.dto';
import { DeleteFileDto } from './dto/delete-file.dto';
import { delete_cover } from './user.swagger';
import { promises } from 'dns';
import { UploadFileResponseDto } from './dto/upload-file-response.dto';
import { TweetsService } from 'src/tweets/tweets.service';
import { ChangeLanguageResponseDto } from './dto/change-language-response.dto';
import { TweetsRepository } from 'src/tweets/tweets.repository';
import { CursorPaginationDto } from './dto/cursor-pagination-params.dto';
import { TweetResponseDTO } from 'src/tweets/dto';
import { PaginationService } from 'src/shared/services/pagination/pagination.service';
import { UserListResponseDto } from './dto/user-list-response.dto';
import { UsernameService } from 'src/auth/username.service';
import { UsernameRecommendationsResponseDto } from './dto/username-recommendations-response.dto';

@Injectable()
export class UserService {
    constructor(
        private readonly user_repository: UserRepository,
        private readonly azure_storage_service: AzureStorageService,
        private readonly config_service: ConfigService,
        @InjectRepository(Category)
        private readonly category_repository: Repository<Category>,
        private readonly tweets_repository: TweetsRepository,
        private readonly pagination_service: PaginationService,
        private readonly username_service: UsernameService
    ) {}

    async getUsersByIds(
        current_user_id: string | null,
        get_users_by_id_dto: GetUsersByIdDto
    ): Promise<UserLookupDto[]> {
        const results = await this.user_repository.getUsersByIds(
            get_users_by_id_dto.ids,
            current_user_id
        );

        const found_users = new Map(
            results.map((result) => [
                result.user_id,
                plainToInstance(UserListItemDto, result, {
                    enableImplicitConversion: true,
                }),
            ])
        );

        return get_users_by_id_dto.ids.map((user_id) => {
            const user = found_users.get(user_id);
            return {
                identifier: user_id,
                success: !!user,
                user: user || null,
            };
        });
    }

    async getUsersByUsernames(
        current_user_id: string | null,
        get_users_by_username_dto: GetUsersByUsernameDto
    ): Promise<UserLookupDto[]> {
        const results = await this.user_repository.getUsersByUsernames(
            get_users_by_username_dto.usernames,
            current_user_id
        );

        const found_users = new Map(
            results.map((result) => [
                result.username,
                plainToInstance(UserListItemDto, result, {
                    enableImplicitConversion: true,
                }),
            ])
        );

        return get_users_by_username_dto.usernames.map((username) => {
            const user = found_users.get(username);
            return {
                identifier: username,
                success: !!user,
                user: user || null,
            };
        });
    }

    async getMe(user_id: string) {
        const result = await this.user_repository.getMyProfile(user_id);

        return plainToInstance(UserProfileDto, result, {
            enableImplicitConversion: true,
        });
    }

    async getUserById(
        current_user_id: string | null,
        target_user_id: string
    ): Promise<DetailedUserProfileDto> {
        const result = await this.user_repository.getProfileById(current_user_id, target_user_id);

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
        const result = await this.user_repository.getProfileByUsername(
            current_user_id,
            target_username
        );

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
    ): Promise<UserListResponseDto> {
        const exists = await this.user_repository.exists({ where: { id: target_user_id } });

        if (!exists) {
            throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
        }

        const { cursor, limit, following } = query_dto;

        const results = await this.user_repository.getFollowersList(
            current_user_id,
            target_user_id,
            cursor,
            limit,
            following
        );

        const users = results.map((result) =>
            plainToInstance(UserListItemDto, result, {
                enableImplicitConversion: true,
                excludeExtraneousValues: true,
            })
        );

        const next_cursor = this.pagination_service.generateNextCursor(
            results,
            'created_at',
            'user_id'
        );

        return {
            data: users,
            pagination: {
                next_cursor,
                has_more: users.length === limit,
            },
        };
    }

    async getFollowing(
        current_user_id: string,
        target_user_id: string,
        query_dto: CursorPaginationDto
    ): Promise<UserListResponseDto> {
        const exists = await this.user_repository.exists({ where: { id: target_user_id } });

        if (!exists) {
            throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
        }

        const { cursor, limit } = query_dto;

        const results = await this.user_repository.getFollowingList(
            current_user_id,
            target_user_id,
            cursor,
            limit
        );
        const users = results.map((result) =>
            plainToInstance(UserListItemDto, result, {
                enableImplicitConversion: true,
            })
        );

        const next_cursor = this.pagination_service.generateNextCursor(
            results,
            'created_at',
            'user_id'
        );

        return {
            data: users,
            pagination: {
                next_cursor,
                has_more: users.length === limit,
            },
        };
    }

    async getMutedList(
        current_user_id: string,
        query_dto: CursorPaginationDto
    ): Promise<UserListResponseDto> {
        const { cursor, limit } = query_dto;

        const results = await this.user_repository.getMutedUsersList(
            current_user_id,
            cursor,
            limit
        );

        const users = results.map((result) =>
            plainToInstance(UserListItemDto, result, {
                enableImplicitConversion: true,
            })
        );

        const next_cursor = this.pagination_service.generateNextCursor(
            results,
            'created_at',
            'user_id'
        );

        return {
            data: users,
            pagination: {
                next_cursor,
                has_more: users.length === limit,
            },
        };
    }

    async getBlockedList(
        current_user_id: string,
        query_dto: CursorPaginationDto
    ): Promise<UserListResponseDto> {
        const { cursor, limit } = query_dto;

        const results = await this.user_repository.getBlockedUsersList(
            current_user_id,
            cursor,
            limit
        );

        const users = results.map((result) =>
            plainToInstance(UserListItemDto, result, {
                enableImplicitConversion: true,
            })
        );

        const next_cursor = this.pagination_service.generateNextCursor(
            results,
            'created_at',
            'user_id'
        );

        return {
            data: users,
            pagination: {
                next_cursor,
                has_more: users.length === limit,
            },
        };
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

        const result = await this.user_repository.deleteFollowRelationship(
            current_user_id,
            target_user_id
        );

        if (!(result.affected && result.affected > 0)) {
            throw new ConflictException(ERROR_MESSAGES.NOT_FOLLOWED);
        }
    }

    async removeFollower(current_user_id: string, target_user_id: string): Promise<void> {
        if (current_user_id === target_user_id) {
            throw new BadRequestException(ERROR_MESSAGES.CANNOT_REMOVE_SELF);
        }

        const result = await this.user_repository.deleteFollowRelationship(
            target_user_id,
            current_user_id
        );

        if (!(result.affected && result.affected > 0)) {
            throw new ConflictException(ERROR_MESSAGES.NOT_A_FOLLOWER);
        }
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

        const result = await this.user_repository.deleteMuteRelationship(
            current_user_id,
            target_user_id
        );

        if (!(result.affected && result.affected > 0)) {
            throw new ConflictException(ERROR_MESSAGES.NOT_MUTED);
        }
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

        const result = await this.user_repository.deleteBlockRelationship(
            current_user_id,
            target_user_id
        );

        if (!(result.affected && result.affected > 0)) {
            throw new ConflictException(ERROR_MESSAGES.NOT_BLOCKED);
        }
    }

    async getLikedPosts(
        current_user_id: string,
        query_dto: CursorPaginationDto
    ): Promise<{
        data: TweetResponseDTO[];
        pagination: {
            next_cursor: string | null;
            has_more: boolean;
        };
    }> {
        const { cursor, limit } = query_dto;
        return await this.tweets_repository.getLikedPostsByUserId(current_user_id, cursor, limit);
    }

    async getPosts(
        current_user_id: string | null,
        target_user_id: string,
        query_dto: CursorPaginationDto
    ): Promise<{
        data: TweetResponseDTO[];
        pagination: {
            next_cursor: string | null;
            has_more: boolean;
        };
    }> {
        const { cursor, limit } = query_dto;
        return await this.tweets_repository.getPostsByUserId(
            target_user_id,
            current_user_id ? current_user_id : undefined,
            cursor,
            limit
        );
    }

    async getReplies(
        current_user_id: string | null,
        target_user_id: string,
        query_dto: CursorPaginationDto
    ): Promise<{
        data: TweetResponseDTO[];
        pagination: {
            next_cursor: string | null;
            has_more: boolean;
        };
    }> {
        const { cursor, limit } = query_dto;
        return await this.tweets_repository.getRepliesByUserId(
            target_user_id,
            current_user_id ? current_user_id : undefined,
            cursor,
            limit
        );
    }

    async getMedia(
        current_user_id: string | null,
        target_user_id: string,
        query_dto: CursorPaginationDto
    ): Promise<{
        data: TweetResponseDTO[];
        pagination: {
            next_cursor: string | null;
            has_more: boolean;
        };
    }> {
        const { cursor, limit } = query_dto;
        return await this.tweets_repository.getMediaByUserId(
            target_user_id,
            current_user_id ? current_user_id : undefined,
            cursor,
            limit
        );
    }

    async updateUser(user_id: string, update_user_dto: UpdateUserDto): Promise<UserProfileDto> {
        const user = await this.user_repository.findOne({
            where: { id: user_id },
        });

        if (!user) {
            throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
        }

        const old_avatar_url = user.avatar_url;
        const old_cover_url = user.cover_url;

        Object.keys(update_user_dto).forEach((key) => {
            if (update_user_dto[key] !== undefined) {
                user[key] = update_user_dto[key];
            }
        });

        const updated_user = await this.user_repository.save(user);

        if (update_user_dto.avatar_url !== undefined && old_avatar_url) {
            const file_name = this.azure_storage_service.extractFileName(old_avatar_url);

            const container_name = this.config_service.get<string>(
                'AZURE_STORAGE_PROFILE_IMAGE_CONTAINER'
            );

            try {
                await this.azure_storage_service.deleteFile(file_name, container_name);
            } catch (error) {
                console.warn('Failed to delete old avatar file:', error.message);
            }
        }

        if (update_user_dto.cover_url !== undefined && old_cover_url) {
            const file_name = this.azure_storage_service.extractFileName(old_cover_url);

            const container_name = this.config_service.get<string>(
                'AZURE_STORAGE_COVER_IMAGE_CONTAINER'
            );
            try {
                await this.azure_storage_service.deleteFile(file_name, container_name);
            } catch (error) {
                console.warn('Failed to delete old cover file:', error.message);
            }
        }

        return plainToInstance(UserProfileDto, updated_user, {
            excludeExtraneousValues: true,
        });
    }

    async deleteUser(current_user_id: string): Promise<void> {
        const user = await this.user_repository.findOne({
            where: { id: current_user_id },
        });

        if (!user) {
            throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
        }

        await this.user_repository.delete(current_user_id);

        if (user.avatar_url) {
            const file_name = this.azure_storage_service.extractFileName(user.avatar_url);

            const container_name = this.config_service.get<string>(
                'AZURE_STORAGE_PROFILE_IMAGE_CONTAINER'
            );

            try {
                await this.azure_storage_service.deleteFile(file_name, container_name);
            } catch (error) {
                console.warn('Failed to delete avatar file:', error.message);
            }
        }

        if (user.cover_url) {
            const file_name = this.azure_storage_service.extractFileName(user.cover_url);

            const container_name = this.config_service.get<string>(
                'AZURE_STORAGE_COVER_IMAGE_CONTAINER'
            );

            try {
                await this.azure_storage_service.deleteFile(file_name, container_name);
            } catch (error) {
                console.warn('Failed to delete cover file:', error.message);
            }
        }
    }

    async uploadAvatar(
        current_user_id: string,
        file: Express.Multer.File
    ): Promise<UploadFileResponseDto> {
        if (!file || !file.buffer) {
            throw new BadRequestException(ERROR_MESSAGES.FILE_NOT_FOUND);
        }
        try {
            const image_name = this.azure_storage_service.generateFileName(
                current_user_id,
                file.originalname
            );

            const container_name = this.config_service.get<string>(
                'AZURE_STORAGE_PROFILE_IMAGE_CONTAINER'
            );

            const image_url = await this.azure_storage_service.uploadFile(
                file.buffer,
                image_name,
                container_name
            );

            return {
                image_url,
                image_name,
            };
        } catch (error) {
            throw new InternalServerErrorException(ERROR_MESSAGES.FILE_UPLOAD_FAILED);
        }
    }

    async deleteAvatar(current_user_id: string, delete_file_dto: DeleteFileDto): Promise<void> {
        const { file_url } = delete_file_dto;

        const file_name = this.azure_storage_service.extractFileName(file_url);
        const user_id = this.azure_storage_service.extractUserIdFromFileName(file_name);

        if (user_id !== current_user_id) {
            throw new ForbiddenException(ERROR_MESSAGES.UNAUTHORIZED_FILE_DELETE);
        }

        const container_name = this.config_service.get<string>(
            'AZURE_STORAGE_PROFILE_IMAGE_CONTAINER'
        );

        return await this.azure_storage_service.deleteFile(file_name, container_name);
    }

    async uploadCover(
        current_user_id: string,
        file: Express.Multer.File
    ): Promise<UploadFileResponseDto> {
        if (!file || !file.buffer) {
            throw new BadRequestException(ERROR_MESSAGES.FILE_NOT_FOUND);
        }
        try {
            const image_name = this.azure_storage_service.generateFileName(
                current_user_id,
                file.originalname
            );

            const container_name = this.config_service.get<string>(
                'AZURE_STORAGE_COVER_IMAGE_CONTAINER'
            );

            const image_url = await this.azure_storage_service.uploadFile(
                file.buffer,
                image_name,
                container_name
            );

            return {
                image_url,
                image_name,
            };
        } catch (error) {
            throw new InternalServerErrorException(ERROR_MESSAGES.FILE_UPLOAD_FAILED);
        }
    }

    async deleteCover(current_user_id: string, delete_file_dto: DeleteFileDto): Promise<void> {
        const { file_url } = delete_file_dto;

        const file_name = this.azure_storage_service.extractFileName(file_url);
        const user_id = this.azure_storage_service.extractUserIdFromFileName(file_name);

        if (user_id !== current_user_id) {
            throw new ForbiddenException(ERROR_MESSAGES.UNAUTHORIZED_FILE_DELETE);
        }

        const container_name = this.config_service.get<string>(
            'AZURE_STORAGE_COVER_IMAGE_CONTAINER'
        );

        return await this.azure_storage_service.deleteFile(file_name, container_name);
    }

    async assignInterests(
        user_id: string,
        assign_interests_dto: AssignInterestsDto
    ): Promise<void> {
        const { category_ids } = assign_interests_dto;

        const existing_categories = await this.category_repository.findBy({
            id: In(category_ids),
        });

        if (existing_categories.length !== category_ids.length) {
            throw new NotFoundException(ERROR_MESSAGES.CATEGORIES_NOT_FOUND);
        }

        const user_interests = category_ids.map((category_id) => ({
            user_id,
            category_id,
        }));

        await this.user_repository.insertUserInterests(user_interests);
    }

    async changeLanguage(
        user_id: string,
        change_language_dto: ChangeLanguageDto
    ): Promise<ChangeLanguageResponseDto> {
        const user = await this.user_repository.findOne({ where: { id: user_id } });

        if (!user) throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);

        user.language = change_language_dto.language;

        await this.user_repository.save(user);

        return { language: user.language };
    }

    async getUsernameRecommendations(user_id: string): Promise<UsernameRecommendationsResponseDto> {
        const user = await this.user_repository.findOne({ where: { id: user_id } });

        if (!user) throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);

        const recommendations =
            await this.username_service.generateUsernameRecommendationsSingleName(user.name);

        return { recommendations };
    }
}
