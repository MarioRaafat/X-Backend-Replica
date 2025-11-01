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

@Injectable()
export class UserService {
    constructor(
        private readonly user_repository: UserRepository,
        private readonly azure_storage_service: AzureStorageService,
        private readonly config_service: ConfigService,
        @InjectRepository(Category)
        private readonly category_repository: Repository<Category>
    ) {}

    async getUsersById(
        current_user_id: string | null,
        get_users_by_id_dto: GetUsersByIdDto
    ): Promise<UserLookupDto[]> {
        const results = await this.user_repository.getUsersById(
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

    async getUsersByUsername(
        current_user_id: string | null,
        get_users_by_username_dto: GetUsersByUsernameDto
    ): Promise<UserLookupDto[]> {
        const results = await this.user_repository.getUsersByUsername(
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

    async getMe(user_id: string): Promise<UserProfileDto> {
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
                RelationshipType.FOLLOW,
                'insert'
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
            RelationshipType.FOLLOW,
            'remove'
        );

        if (!validation_result.relationship_exists) {
            throw new ConflictException(ERROR_MESSAGES.NOT_FOLLOWED);
        }

        await this.user_repository.deleteFollowRelationship(current_user_id, target_user_id);
    }

    async removeFollower(current_user_id: string, target_user_id: string): Promise<void> {
        if (current_user_id === target_user_id) {
            throw new BadRequestException(ERROR_MESSAGES.CANNOT_REMOVE_SELF);
        }

        const validation_result = await this.user_repository.validateRelationshipRequest(
            target_user_id,
            current_user_id,
            RelationshipType.FOLLOW,
            'remove'
        );

        console.log(validation_result.relationship_exists);
        if (!validation_result.relationship_exists) {
            throw new ConflictException(ERROR_MESSAGES.NOT_A_FOLLOWER);
        }

        await this.user_repository.deleteFollowRelationship(target_user_id, current_user_id);
    }

    async muteUser(current_user_id: string, target_user_id: string): Promise<void> {
        if (current_user_id === target_user_id) {
            throw new BadRequestException(ERROR_MESSAGES.CANNOT_MUTE_YOURSELF);
        }

        const validation_result = await this.user_repository.validateRelationshipRequest(
            current_user_id,
            target_user_id,
            RelationshipType.MUTE,
            'insert'
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
            RelationshipType.MUTE,
            'remove'
        );

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
            RelationshipType.BLOCK,
            'insert'
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
            RelationshipType.BLOCK,
            'remove'
        );

        if (!validation_result.relationship_exists) {
            throw new ConflictException(ERROR_MESSAGES.NOT_BLOCKED);
        }

        await this.user_repository.deleteBlockRelationship(current_user_id, target_user_id);
    }

    async getLikedPosts(current_user_id: string, query_dto: PaginationParamsDto) {}

    async getPosts(
        current_user_id: string,
        target_user_id: string,
        query_dto: PaginationParamsDto
    ) {}

    async getReplies(
        current_user_id: string,
        target_user_id: string,
        query_dto: PaginationParamsDto
    ) {}

    async getMedia(
        current_user_id: string,
        target_user_id: string,
        query_dto: PaginationParamsDto
    ) {}

    async updateUser(user_id: string, update_user_dto: UpdateUserDto): Promise<UserProfileDto> {
        const user = await this.user_repository.findOne({
            where: { id: user_id },
        });

        if (!user) {
            throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
        }

        Object.assign(user, update_user_dto);

        const updated_user = await this.user_repository.save(user);

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
    }

    async uploadAvatar(
        current_user_id: string,
        file: Express.Multer.File
    ): Promise<UploadFileResponseDto> {
        try {
            if (!file || !file.buffer) {
                throw new BadRequestException(ERROR_MESSAGES.FILE_NOT_FOUND);
            }

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
        try {
            if (!file || !file.buffer) {
                throw new BadRequestException(ERROR_MESSAGES.FILE_NOT_FOUND);
            }

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

    async assignInserests(user_id: string, assign_interests_dto: AssignInterestsDto) {
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

    async changeLanguage(user_id: string, change_language_dto: ChangeLanguageDto) {
        const user = await this.user_repository.findOne({ where: { id: user_id } });

        if (!user) throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);

        user.language = change_language_dto.language;

        await this.user_repository.save(user);

        return { language: user.language };
    }
}
