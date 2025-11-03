import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';
import { UserProfileDto } from './dto/user-profile.dto';
import { DetailedUserProfileDto } from './dto/detailed-user-profile.dto';
import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    NotFoundException,
} from '@nestjs/common';
import { ERROR_MESSAGES } from 'src/constants/swagger-messages';
import { UserListItemDto } from './dto/user-list-item.dto';
import { GetFollowersDto } from './dto/get-followers.dto';
import { RelationshipType } from './enums/relationship-type.enum';
import { AzureStorageService } from 'src/azure-storage/azure-storage.service';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Category } from 'src/category/entities';
import { UserLookupDto } from './dto/user-lookup.dto';
import { GetUsersByIdDto } from './dto/get-users-by-id.dto';
import { GetUsersByUsernameDto } from './dto/get-users-by-username.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities';
import { UploadFileResponseDto } from './dto/upload-file-response.dto';
import { DeleteFileDto } from './dto/delete-file.dto';
import { AssignInterestsDto } from './dto/assign-interests.dto';
import { DeleteResult, In, Repository } from 'typeorm';
import { ChangeLanguageDto } from './dto/change-language.dto';
import { ChangeLanguageResponseDto } from './dto/change-language-response.dto';

describe('UserService', () => {
    let service: UserService;
    let user_repository: jest.Mocked<UserRepository>;
    let azure_storage_service: jest.Mocked<AzureStorageService>;
    let config_service: jest.Mocked<ConfigService>;
    let category_repository: jest.Mocked<Repository<Category>>;

    beforeEach(async () => {
        const mock_user_repository = {
            getFollowersList: jest.fn(),
            getFollowingList: jest.fn(),
            getMutedUsersList: jest.fn(),
            getBlockedUsersList: jest.fn(),
            insertFollowRelationship: jest.fn(),
            deleteFollowRelationship: jest.fn(),
            insertMuteRelationship: jest.fn(),
            deleteMuteRelationship: jest.fn(),
            insertBlockRelationship: jest.fn(),
            deleteBlockRelationship: jest.fn(),
            validateRelationshipRequest: jest.fn(),
            verifyFollowPermissions: jest.fn(),
            getMyProfile: jest.fn(),
            getProfileById: jest.fn(),
            getProfileByUsername: jest.fn(),
            getUsersByIds: jest.fn(),
            getUsersByUsernames: jest.fn(),
            insertUserInterests: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
            exists: jest.fn(),
        };

        const mock_azure_storage_service = {
            uploadFile: jest.fn(),
            deleteFile: jest.fn(),
            generateFileName: jest.fn(),
            getContainerClient: jest.fn(),
            onModuleInit: jest.fn(),
            extractFileName: jest.fn(),
            extractUserIdFromFileName: jest.fn(),
        };

        const mock_config_service = {
            get: jest.fn(),
        };

        const mock_category_repository = {
            findBy: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserService,
                { provide: UserRepository, useValue: mock_user_repository },
                { provide: AzureStorageService, useValue: mock_azure_storage_service },
                { provide: ConfigService, useValue: mock_config_service },
                { provide: getRepositoryToken(Category), useValue: mock_category_repository },
            ],
        }).compile();

        service = module.get(UserService);
        user_repository = module.get(UserRepository);
        azure_storage_service = module.get(AzureStorageService);
        config_service = module.get(ConfigService);
        category_repository = module.get(getRepositoryToken(Category));
    });

    afterEach(() => jest.clearAllMocks());

    describe('getUsersByIds', () => {
        it('should return list of users with success status for all found users', async () => {
            const mock_user: UserListItemDto[] = [
                {
                    user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                    name: 'Alyaa Ali',
                    username: 'Alyaali242',
                    bio: 'hi there!',
                    avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                    is_following: true,
                    is_follower: false,
                    is_muted: false,
                    is_blocked: true,
                },
            ];
            const mock_response: UserLookupDto[] = [
                {
                    identifier: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                    success: true,
                    user: {
                        user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                        name: 'Alyaa Ali',
                        username: 'Alyaali242',
                        bio: 'hi there!',
                        avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                        is_following: true,
                        is_follower: false,
                        is_muted: false,
                        is_blocked: true,
                    },
                },
            ];

            const get_users_by_id_dto: GetUsersByIdDto = {
                ids: ['0c059899-f706-4c8f-97d7-ba2e9fc22d6d'],
            };

            const current_user_id = '1a2b3c4d-5e6f-7g8h-9i0j-k1l2m3n4o5p6';

            const get_users_by_ids_spy = jest
                .spyOn(user_repository, 'getUsersByIds')
                .mockResolvedValueOnce(mock_user);

            const result = await service.getUsersByIds(current_user_id, get_users_by_id_dto);

            expect(get_users_by_ids_spy).toHaveBeenCalledWith(
                get_users_by_id_dto.ids,
                current_user_id
            );
            expect(get_users_by_ids_spy).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_response);
        });

        it('should return users with success false for not found users', async () => {
            const mock_user: UserListItemDto[] = [
                {
                    user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                    name: 'Alyaa Ali',
                    username: 'Alyaali242',
                    bio: 'hi there!',
                    avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                    is_following: true,
                    is_follower: false,
                    is_muted: false,
                    is_blocked: true,
                },
            ];
            const mock_response: UserLookupDto[] = [
                {
                    identifier: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                    success: true,
                    user: {
                        user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                        name: 'Alyaa Ali',
                        username: 'Alyaali242',
                        bio: 'hi there!',
                        avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                        is_following: true,
                        is_follower: false,
                        is_muted: false,
                        is_blocked: true,
                    },
                },
                {
                    identifier: 'nonexistent-user-id',
                    success: false,
                    user: null,
                },
            ];
            const get_users_by_id_dto: GetUsersByIdDto = {
                ids: ['0c059899-f706-4c8f-97d7-ba2e9fc22d6d', 'nonexistent-user-id'],
            };

            const current_user_id = '1a2b3c4d-5e6f-7g8h-9i0j-k1l2m3n4o5p6';

            const get_users_by_ids_spy = jest
                .spyOn(user_repository, 'getUsersByIds')
                .mockResolvedValueOnce(mock_user);

            const result = await service.getUsersByIds(current_user_id, get_users_by_id_dto);

            expect(get_users_by_ids_spy).toHaveBeenCalledWith(
                get_users_by_id_dto.ids,
                current_user_id
            );
            expect(get_users_by_ids_spy).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_response);
        });

        it('should work with null current_user_id', async () => {
            const mock_user: UserListItemDto[] = [
                {
                    user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                    name: 'Alyaa Ali',
                    username: 'Alyaali242',
                    bio: 'hi there!',
                    avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                },
            ];
            const mock_response: UserLookupDto[] = [
                {
                    identifier: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                    success: true,
                    user: {
                        user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                        name: 'Alyaa Ali',
                        username: 'Alyaali242',
                        bio: 'hi there!',
                        avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                    },
                },
            ];

            const get_users_by_id_dto: GetUsersByIdDto = {
                ids: ['0c059899-f706-4c8f-97d7-ba2e9fc22d6d'],
            };

            const current_user_id = null;

            const get_users_by_ids_spy = jest
                .spyOn(user_repository, 'getUsersByIds')
                .mockResolvedValueOnce(mock_user);

            const result = await service.getUsersByIds(current_user_id, get_users_by_id_dto);

            expect(get_users_by_ids_spy).toHaveBeenCalledWith(
                get_users_by_id_dto.ids,
                current_user_id
            );
            expect(get_users_by_ids_spy).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_response);
        });

        it('should return all users with success false when no users found', async () => {
            const mock_user = [];
            const mock_response: UserLookupDto[] = [
                {
                    identifier: 'nonexistent-id-1',
                    success: false,
                    user: null,
                },
                {
                    identifier: 'nonexistent-id-2',
                    success: false,
                    user: null,
                },
            ];

            const get_users_by_id_dto: GetUsersByIdDto = {
                ids: ['nonexistent-id-1', 'nonexistent-id-2'],
            };

            const current_user_id = '1a2b3c4d-5e6f-7g8h-9i0j-k1l2m3n4o5p6';

            const get_users_by_ids_spy = jest
                .spyOn(user_repository, 'getUsersByIds')
                .mockResolvedValueOnce(mock_user);

            const result = await service.getUsersByIds(current_user_id, get_users_by_id_dto);

            expect(get_users_by_ids_spy).toHaveBeenCalledWith(
                get_users_by_id_dto.ids,
                current_user_id
            );
            expect(get_users_by_ids_spy).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_response);
        });
    });

    describe('getUsersByUsernames', () => {
        it('should return list of users with success status for all found users', async () => {
            const mock_user: UserListItemDto[] = [
                {
                    user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                    name: 'Alyaa Ali',
                    username: 'Alyaali242',
                    bio: 'hi there!',
                    avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                    is_following: true,
                    is_follower: false,
                    is_muted: false,
                    is_blocked: true,
                },
            ];
            const mock_response: UserLookupDto[] = [
                {
                    identifier: 'Alyaali242',
                    success: true,
                    user: {
                        user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                        name: 'Alyaa Ali',
                        username: 'Alyaali242',
                        bio: 'hi there!',
                        avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                        is_following: true,
                        is_follower: false,
                        is_muted: false,
                        is_blocked: true,
                    },
                },
            ];

            const get_users_by_username_dto: GetUsersByUsernameDto = {
                usernames: ['Alyaali242'],
            };

            const current_user_id = '1a2b3c4d-5e6f-7g8h-9i0j-k1l2m3n4o5p6';

            const get_users_by_usernames_spy = jest
                .spyOn(user_repository, 'getUsersByUsernames')
                .mockResolvedValueOnce(mock_user);

            const result = await service.getUsersByUsernames(
                current_user_id,
                get_users_by_username_dto
            );

            expect(get_users_by_usernames_spy).toHaveBeenCalledWith(
                get_users_by_username_dto.usernames,
                current_user_id
            );
            expect(get_users_by_usernames_spy).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_response);
        });

        it('should return users with success false for not found users', async () => {
            const mock_user: UserListItemDto[] = [
                {
                    user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                    name: 'Alyaa Ali',
                    username: 'Alyaali242',
                    bio: 'hi there!',
                    avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                    is_following: true,
                    is_follower: false,
                    is_muted: false,
                    is_blocked: true,
                },
            ];
            const mock_response: UserLookupDto[] = [
                {
                    identifier: 'Alyaali242',
                    success: true,
                    user: {
                        user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                        name: 'Alyaa Ali',
                        username: 'Alyaali242',
                        bio: 'hi there!',
                        avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                        is_following: true,
                        is_follower: false,
                        is_muted: false,
                        is_blocked: true,
                    },
                },
                {
                    identifier: 'nonexistent-username',
                    success: false,
                    user: null,
                },
            ];
            const get_users_by_username_dto: GetUsersByUsernameDto = {
                usernames: ['Alyaali242', 'nonexistent-username'],
            };

            const current_user_id = '1a2b3c4d-5e6f-7g8h-9i0j-k1l2m3n4o5p6';

            const get_users_by_usernames_spy = jest
                .spyOn(user_repository, 'getUsersByUsernames')
                .mockResolvedValueOnce(mock_user);

            const result = await service.getUsersByUsernames(
                current_user_id,
                get_users_by_username_dto
            );

            expect(get_users_by_usernames_spy).toHaveBeenCalledWith(
                get_users_by_username_dto.usernames,
                current_user_id
            );
            expect(get_users_by_usernames_spy).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_response);
        });

        it('should work with null current_user_id', async () => {
            const mock_user: UserListItemDto[] = [
                {
                    user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                    name: 'Alyaa Ali',
                    username: 'Alyaali242',
                    bio: 'hi there!',
                    avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                },
            ];
            const mock_response: UserLookupDto[] = [
                {
                    identifier: 'Alyaali242',
                    success: true,
                    user: {
                        user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                        name: 'Alyaa Ali',
                        username: 'Alyaali242',
                        bio: 'hi there!',
                        avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                    },
                },
            ];

            const get_users_by_username_dto: GetUsersByUsernameDto = {
                usernames: ['Alyaali242'],
            };

            const current_user_id = null;

            const get_users_by_usernames_spy = jest
                .spyOn(user_repository, 'getUsersByUsernames')
                .mockResolvedValueOnce(mock_user);

            const result = await service.getUsersByUsernames(
                current_user_id,
                get_users_by_username_dto
            );

            expect(get_users_by_usernames_spy).toHaveBeenCalledWith(
                get_users_by_username_dto.usernames,
                current_user_id
            );
            expect(get_users_by_usernames_spy).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_response);
        });

        it('should return all users with success false when no users found', async () => {
            const mock_user = [];
            const mock_response: UserLookupDto[] = [
                {
                    identifier: 'nonexistent-username-1',
                    success: false,
                    user: null,
                },
                {
                    identifier: 'nonexistent-username-2',
                    success: false,
                    user: null,
                },
            ];

            const get_users_by_username_dto: GetUsersByUsernameDto = {
                usernames: ['nonexistent-username-1', 'nonexistent-username-2'],
            };

            const current_user_id = '1a2b3c4d-5e6f-7g8h-9i0j-k1l2m3n4o5p6';

            const get_users_by_usernames_spy = jest
                .spyOn(user_repository, 'getUsersByUsernames')
                .mockResolvedValueOnce(mock_user);

            const result = await service.getUsersByUsernames(
                current_user_id,
                get_users_by_username_dto
            );

            expect(get_users_by_usernames_spy).toHaveBeenCalledWith(
                get_users_by_username_dto.usernames,
                current_user_id
            );
            expect(get_users_by_usernames_spy).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_response);
        });
    });

    describe('getMe', () => {
        it('should call user_service.getMe with the current user id', async () => {
            const mock_response: UserProfileDto = {
                user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                name: 'Alyaa Ali',
                username: 'Alyaali242',
                bio: 'hi there!',
                avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                cover_url: 'https://cdn.app.com/profiles/u877.jpg',
                followers_count: 5,
                following_count: 15,
                country: 'Egypt',
                created_at: new Date('2025-10-30'),
            };

            const user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';

            const get_my_profile_spy = jest
                .spyOn(user_repository, 'getMyProfile')
                .mockResolvedValue(mock_response);

            const result = await service.getMe(user_id);

            expect(get_my_profile_spy).toHaveBeenCalledWith(user_id);
            expect(get_my_profile_spy).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_response);
        });
    });

    describe('getUserById', () => {
        it('should return detailed user profile by id when user exists', async () => {
            const mock_response: DetailedUserProfileDto = {
                user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                name: 'Alyaa Ali',
                username: 'Alyaali242',
                bio: 'hi there!',
                avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                cover_url: 'https://cdn.app.com/profiles/u877.jpg',
                followers_count: 5,
                following_count: 15,
                country: 'Egypt',
                created_at: new Date('2025-10-30'),
                is_follower: true,
                is_following: false,
                is_muted: false,
                is_blocked: true,
                top_mutual_followers: [
                    {
                        name: 'Mario Raafat',
                        avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                    },
                    {
                        name: 'Amira Khalid',
                        avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                    },
                ],
                mutual_followers_count: 5,
            };

            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';

            const get_profile_by_id_spy = jest
                .spyOn(user_repository, 'getProfileById')
                .mockResolvedValue(mock_response);

            const result = await service.getUserById(current_user_id, target_user_id);

            expect(get_profile_by_id_spy).toHaveBeenCalledWith(current_user_id, target_user_id);
            expect(get_profile_by_id_spy).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_response);
        });

        it('should work with null current_user_id', async () => {
            const mock_response: DetailedUserProfileDto = {
                user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                name: 'Alyaa Ali',
                username: 'Alyaali242',
                bio: 'hi there!',
                avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                cover_url: 'https://cdn.app.com/profiles/u877.jpg',
                followers_count: 5,
                following_count: 15,
                country: 'Egypt',
                created_at: new Date('2025-10-30'),
                is_follower: false,
                is_following: false,
                is_muted: false,
                is_blocked: false,
                top_mutual_followers: [],
                mutual_followers_count: 0,
            };

            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';
            const current_user_id = null;

            const get_profile_by_id_spy = jest
                .spyOn(user_repository, 'getProfileById')
                .mockResolvedValue(mock_response);

            const result = await service.getUserById(current_user_id, target_user_id);

            expect(get_profile_by_id_spy).toHaveBeenCalledWith(current_user_id, target_user_id);
            expect(get_profile_by_id_spy).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_response);
        });

        it('should throw NotFoundException when user does not exist', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';

            const get_profile_by_id_spy = jest
                .spyOn(user_repository, 'getProfileById')
                .mockResolvedValueOnce(null);

            await expect(service.getUserById(current_user_id, target_user_id)).rejects.toThrow(
                ERROR_MESSAGES.USER_NOT_FOUND
            );

            expect(get_profile_by_id_spy).toHaveBeenCalledWith(current_user_id, target_user_id);
            expect(get_profile_by_id_spy).toHaveBeenCalledTimes(1);
        });
    });

    describe('getUserByUsername', () => {
        it('should return detailed user profile by username when user exists', async () => {
            const mock_response: DetailedUserProfileDto = {
                user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                name: 'Alyaa Ali',
                username: 'Alyaali242',
                bio: 'hi there!',
                avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                cover_url: 'https://cdn.app.com/profiles/u877.jpg',
                followers_count: 5,
                following_count: 15,
                country: 'Egypt',
                created_at: new Date('2025-10-30'),
                is_follower: true,
                is_following: false,
                is_muted: false,
                is_blocked: true,
                top_mutual_followers: [
                    {
                        name: 'Mario Raafat',
                        avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                    },
                    {
                        name: 'Amira Khalid',
                        avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                    },
                ],
                mutual_followers_count: 5,
            };

            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_username = 'Alyaa242';

            const get_profile_by_username_spy = jest
                .spyOn(user_repository, 'getProfileByUsername')
                .mockResolvedValue(mock_response);

            const result = await service.getUserByUsername(current_user_id, target_username);

            expect(get_profile_by_username_spy).toHaveBeenCalledWith(
                current_user_id,
                target_username
            );
            expect(get_profile_by_username_spy).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_response);
        });

        it('should work with null current_user_id', async () => {
            const mock_response: DetailedUserProfileDto = {
                user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                name: 'Alyaa Ali',
                username: 'Alyaali242',
                bio: 'hi there!',
                avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                cover_url: 'https://cdn.app.com/profiles/u877.jpg',
                followers_count: 5,
                following_count: 15,
                country: 'Egypt',
                created_at: new Date('2025-10-30'),
                is_follower: false,
                is_following: false,
                is_muted: false,
                is_blocked: false,
                top_mutual_followers: [],
                mutual_followers_count: 0,
            };

            const target_username = 'Alyaa242';
            const current_user_id = null;

            const get_profile_by_username_spy = jest
                .spyOn(user_repository, 'getProfileByUsername')
                .mockResolvedValue(mock_response);

            const result = await service.getUserByUsername(current_user_id, target_username);

            expect(get_profile_by_username_spy).toHaveBeenCalledWith(
                current_user_id,
                target_username
            );
            expect(get_profile_by_username_spy).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_response);
        });

        it('should throw NotFoundException when user does not exist', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_username = 'Alyaa242';

            const get_profile_by_username_spy = jest
                .spyOn(user_repository, 'getProfileByUsername')
                .mockResolvedValueOnce(null);

            await expect(
                service.getUserByUsername(current_user_id, target_username)
            ).rejects.toThrow(ERROR_MESSAGES.USER_NOT_FOUND);

            expect(get_profile_by_username_spy).toHaveBeenCalledWith(
                current_user_id,
                target_username
            );
            expect(get_profile_by_username_spy).toHaveBeenCalledTimes(1);
        });
    });

    describe('getFollowers', () => {
        it('should return list of followers', async () => {
            const mock_followers: UserListItemDto[] = [
                {
                    user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                    name: 'Alyaa Ali',
                    username: 'Alyaali242',
                    bio: 'hi there!',
                    avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                    is_following: false,
                    is_follower: false,
                    is_muted: false,
                    is_blocked: true,
                },
                {
                    user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                    name: 'Amira Khalid',
                    username: 'amira2342',
                    bio: 'hi there!',
                    avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                    is_following: true,
                    is_follower: false,
                    is_muted: true,
                    is_blocked: true,
                },
            ];

            const query_dto: GetFollowersDto = {
                page_offset: 0,
                page_size: 10,
            };

            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';

            const exists_spy = jest.spyOn(user_repository, 'exists').mockResolvedValueOnce(true);

            const get_followers_spy = jest
                .spyOn(user_repository, 'getFollowersList')
                .mockResolvedValueOnce(mock_followers);

            const result = await service.getFollowers(current_user_id, target_user_id, query_dto);

            expect(exists_spy).toHaveBeenCalledWith({ where: { id: target_user_id } });
            expect(get_followers_spy).toHaveBeenCalledWith(
                current_user_id,
                target_user_id,
                0,
                10,
                undefined
            );
            expect(result).toEqual(mock_followers);
        });

        it('should return followers filtered by following flag', async () => {
            const mock_followers: UserListItemDto[] = [
                {
                    user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                    name: 'Alyaa Ali',
                    username: 'Alyaali242',
                    bio: 'hi there!',
                    avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                    is_following: true,
                    is_follower: false,
                    is_muted: false,
                    is_blocked: true,
                },
            ];

            const query_dto: GetFollowersDto = {
                page_offset: 0,
                page_size: 10,
                following: true,
            };

            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';

            const exists_spy = jest.spyOn(user_repository, 'exists').mockResolvedValueOnce(true);

            const get_followers_spy = jest
                .spyOn(user_repository, 'getFollowersList')
                .mockResolvedValueOnce(mock_followers);

            const result = await service.getFollowers(current_user_id, target_user_id, query_dto);

            expect(exists_spy).toHaveBeenCalledWith({ where: { id: target_user_id } });
            expect(get_followers_spy).toHaveBeenCalledWith(
                current_user_id,
                target_user_id,
                0,
                10,
                true
            );
            expect(result).toEqual(mock_followers);
        });

        it('should throw NotFoundException when user does not exist', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';

            const query_dto: GetFollowersDto = {
                page_offset: 0,
                page_size: 10,
            };

            const exists_spy = jest.spyOn(user_repository, 'exists').mockResolvedValueOnce(false);

            await expect(
                service.getFollowers(current_user_id, target_user_id, query_dto)
            ).rejects.toThrow(ERROR_MESSAGES.USER_NOT_FOUND);

            expect(exists_spy).toHaveBeenCalledWith({ where: { id: target_user_id } });
        });
    });

    describe('getFollowing', () => {
        it('should return list of users being followed', async () => {
            const mock_following: UserListItemDto[] = [
                {
                    user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                    name: 'Alyaa Ali',
                    username: 'Alyaali242',
                    bio: 'hi there!',
                    avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                    is_following: false,
                    is_follower: false,
                    is_muted: false,
                    is_blocked: true,
                },
                {
                    user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                    name: 'Amira Khalid',
                    username: 'amira2342',
                    bio: 'hi there!',
                    avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                    is_following: true,
                    is_follower: false,
                    is_muted: true,
                    is_blocked: true,
                },
            ];

            const query_dto: GetFollowersDto = {
                page_offset: 0,
                page_size: 10,
            };

            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';

            const exists_spy = jest.spyOn(user_repository, 'exists').mockResolvedValueOnce(true);

            const get_following_spy = jest
                .spyOn(user_repository, 'getFollowingList')
                .mockResolvedValueOnce(mock_following);

            const result = await service.getFollowing(current_user_id, target_user_id, query_dto);

            expect(exists_spy).toHaveBeenCalledWith({ where: { id: target_user_id } });
            expect(get_following_spy).toHaveBeenCalledWith(current_user_id, target_user_id, 0, 10);
            expect(result).toEqual(mock_following);
        });

        it('should throw NotFoundException when user does not exist', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';

            const query_dto: GetFollowersDto = {
                page_offset: 0,
                page_size: 10,
            };

            const exists_spy = jest.spyOn(user_repository, 'exists').mockResolvedValueOnce(false);

            await expect(
                service.getFollowing(current_user_id, target_user_id, query_dto)
            ).rejects.toThrow(ERROR_MESSAGES.USER_NOT_FOUND);

            expect(exists_spy).toHaveBeenCalledWith({ where: { id: target_user_id } });
        });
    });

    describe('getMutedList', () => {
        it('should return list of muted users', async () => {
            const mock_muted: UserListItemDto[] = [
                {
                    user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                    name: 'Alyaa Ali',
                    username: 'Alyaali242',
                    bio: 'hi there!',
                    avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                    is_following: false,
                    is_follower: false,
                    is_muted: false,
                    is_blocked: true,
                },
                {
                    user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                    name: 'Amira Khalid',
                    username: 'amira2342',
                    bio: 'hi there!',
                    avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                    is_following: true,
                    is_follower: false,
                    is_muted: true,
                    is_blocked: true,
                },
            ];

            const query_dto: GetFollowersDto = {
                page_offset: 0,
                page_size: 10,
            };

            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';

            const get_muted_spy = jest
                .spyOn(user_repository, 'getMutedUsersList')
                .mockResolvedValueOnce(mock_muted);

            const result = await service.getMutedList(current_user_id, query_dto);

            expect(get_muted_spy).toHaveBeenCalledWith(current_user_id, 0, 10);
            expect(result).toEqual(mock_muted);
        });
    });

    describe('getBlockedList', () => {
        it('should return list of blocked users', async () => {
            const mock_blocked: UserListItemDto[] = [
                {
                    user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                    name: 'Alyaa Ali',
                    username: 'Alyaali242',
                    bio: 'hi there!',
                    avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                    is_following: false,
                    is_follower: false,
                    is_muted: false,
                    is_blocked: true,
                },
                {
                    user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                    name: 'Amira Khalid',
                    username: 'amira2342',
                    bio: 'hi there!',
                    avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                    is_following: true,
                    is_follower: false,
                    is_muted: true,
                    is_blocked: true,
                },
            ];

            const query_dto: GetFollowersDto = {
                page_offset: 0,
                page_size: 10,
            };

            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';

            const get_blocked_spy = jest
                .spyOn(user_repository, 'getBlockedUsersList')
                .mockResolvedValueOnce(mock_blocked);

            const result = await service.getBlockedList(current_user_id, query_dto);

            expect(get_blocked_spy).toHaveBeenCalledWith(current_user_id, 0, 10);
            expect(result).toEqual(mock_blocked);
        });
    });

    describe('followUser', () => {
        it('should successfully follow a user', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';

            const validate_spy = jest
                .spyOn(user_repository, 'validateRelationshipRequest')
                .mockResolvedValueOnce({
                    user_exists: true,
                    relationship_exists: false,
                });

            const verify_permissions_spy = jest
                .spyOn(user_repository, 'verifyFollowPermissions')
                .mockResolvedValueOnce({
                    blocked_me: false,
                    is_blocked: false,
                });

            const insert_follow_spy = jest
                .spyOn(user_repository, 'insertFollowRelationship')
                .mockResolvedValueOnce({} as any);

            await service.followUser(current_user_id, target_user_id);

            expect(validate_spy).toHaveBeenCalledWith(
                current_user_id,
                target_user_id,
                RelationshipType.FOLLOW
            );
            expect(validate_spy).toHaveBeenCalledTimes(1);
            expect(verify_permissions_spy).toHaveBeenCalledWith(current_user_id, target_user_id);
            expect(verify_permissions_spy).toHaveBeenCalledTimes(1);
            expect(insert_follow_spy).toHaveBeenCalledWith(current_user_id, target_user_id);
            expect(insert_follow_spy).toHaveBeenCalledTimes(1);
        });

        it('should throw BadRequestException when trying to follow yourself', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';

            const insert_follow_spy = jest.spyOn(user_repository, 'insertFollowRelationship');

            await expect(service.followUser(current_user_id, current_user_id)).rejects.toThrow(
                new BadRequestException(ERROR_MESSAGES.CANNOT_FOLLOW_YOURSELF)
            );

            expect(insert_follow_spy).not.toHaveBeenCalled();
        });

        it('should throw NotFoundException when target user does not exist', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';

            const validate_spy = jest
                .spyOn(user_repository, 'validateRelationshipRequest')
                .mockResolvedValueOnce({
                    user_exists: false,
                    relationship_exists: false,
                });

            const verify_permissions_spy = jest
                .spyOn(user_repository, 'verifyFollowPermissions')
                .mockResolvedValueOnce({
                    blocked_me: false,
                    is_blocked: false,
                });

            const insert_follow_spy = jest.spyOn(user_repository, 'insertFollowRelationship');

            await expect(service.followUser(current_user_id, target_user_id)).rejects.toThrow(
                new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND)
            );

            expect(insert_follow_spy).not.toHaveBeenCalled();
            expect(validate_spy).toHaveBeenCalledWith(
                current_user_id,
                target_user_id,
                RelationshipType.FOLLOW
            );
            expect(validate_spy).toHaveBeenCalledTimes(1);
            expect(verify_permissions_spy).toHaveBeenCalledWith(current_user_id, target_user_id);
            expect(verify_permissions_spy).toHaveBeenCalledTimes(1);
        });

        it('should throw ConflictException when already following', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';

            const validate_spy = jest
                .spyOn(user_repository, 'validateRelationshipRequest')
                .mockResolvedValueOnce({
                    user_exists: true,
                    relationship_exists: true,
                });

            const verify_permissions_spy = jest
                .spyOn(user_repository, 'verifyFollowPermissions')
                .mockResolvedValueOnce({
                    blocked_me: false,
                    is_blocked: false,
                });

            const insert_follow_spy = jest.spyOn(user_repository, 'insertFollowRelationship');

            await expect(service.followUser(current_user_id, target_user_id)).rejects.toThrow(
                new ConflictException(ERROR_MESSAGES.ALREADY_FOLLOWING)
            );

            expect(insert_follow_spy).not.toHaveBeenCalled();

            expect(validate_spy).toHaveBeenCalledWith(
                current_user_id,
                target_user_id,
                RelationshipType.FOLLOW
            );
            expect(validate_spy).toHaveBeenCalledTimes(1);
            expect(verify_permissions_spy).toHaveBeenCalledWith(current_user_id, target_user_id);
            expect(verify_permissions_spy).toHaveBeenCalledTimes(1);
        });

        it('should throw ForbiddenException when blocked by target user', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';

            const validate_spy = jest
                .spyOn(user_repository, 'validateRelationshipRequest')
                .mockResolvedValueOnce({
                    user_exists: true,
                    relationship_exists: false,
                });

            const verify_permissions_spy = jest
                .spyOn(user_repository, 'verifyFollowPermissions')
                .mockResolvedValueOnce({
                    blocked_me: true,
                    is_blocked: false,
                });

            const insert_follow_spy = jest.spyOn(user_repository, 'insertFollowRelationship');

            await expect(service.followUser(current_user_id, target_user_id)).rejects.toThrow(
                new ForbiddenException(ERROR_MESSAGES.CANNOT_FOLLOW_USER)
            );

            expect(insert_follow_spy).not.toHaveBeenCalled();

            expect(validate_spy).toHaveBeenCalledWith(
                current_user_id,
                target_user_id,
                RelationshipType.FOLLOW
            );
            expect(validate_spy).toHaveBeenCalledTimes(1);
            expect(verify_permissions_spy).toHaveBeenCalledWith(current_user_id, target_user_id);
            expect(verify_permissions_spy).toHaveBeenCalledTimes(1);
        });

        it('should throw BadRequestException when current user has blocked target', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';

            const validate_spy = jest
                .spyOn(user_repository, 'validateRelationshipRequest')
                .mockResolvedValueOnce({
                    user_exists: true,
                    relationship_exists: false,
                });

            const verify_permissions_spy = jest
                .spyOn(user_repository, 'verifyFollowPermissions')
                .mockResolvedValueOnce({
                    blocked_me: false,
                    is_blocked: true,
                });

            const insert_follow_spy = jest.spyOn(user_repository, 'insertFollowRelationship');

            await expect(service.followUser(current_user_id, target_user_id)).rejects.toThrow(
                new BadRequestException(ERROR_MESSAGES.CANNOT_FOLLOW_BLOCKED_USER)
            );

            expect(insert_follow_spy).not.toHaveBeenCalled();

            expect(validate_spy).toHaveBeenCalledWith(
                current_user_id,
                target_user_id,
                RelationshipType.FOLLOW
            );
            expect(validate_spy).toHaveBeenCalledTimes(1);
            expect(verify_permissions_spy).toHaveBeenCalledWith(current_user_id, target_user_id);
            expect(verify_permissions_spy).toHaveBeenCalledTimes(1);
        });
    });

    describe('unfollowUser', () => {
        it('should successfully unfollow a user', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';

            const mock_result: DeleteResult = { affected: 1, raw: [] };

            const delete_follow_spy = jest
                .spyOn(user_repository, 'deleteFollowRelationship')
                .mockResolvedValue(mock_result);

            await service.unfollowUser(current_user_id, target_user_id);

            expect(delete_follow_spy).toHaveBeenCalledWith(current_user_id, target_user_id);
            expect(delete_follow_spy).toHaveBeenCalledTimes(1);
        });

        it('should throw BadRequestException when trying to unfollow yourself', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';

            const delete_follow_spy = jest
                .spyOn(user_repository, 'deleteFollowRelationship')
                .mockResolvedValueOnce({} as any);

            await expect(service.unfollowUser(current_user_id, current_user_id)).rejects.toThrow(
                new BadRequestException(ERROR_MESSAGES.CANNOT_UNFOLLOW_YOURSELF)
            );

            expect(delete_follow_spy).not.toHaveBeenCalled();
        });

        it('should throw ConflictException when not following the user', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';

            const mock_result: DeleteResult = { affected: 0, raw: [] };

            const delete_follow_spy = jest
                .spyOn(user_repository, 'deleteFollowRelationship')
                .mockResolvedValue(mock_result);

            await expect(service.unfollowUser(current_user_id, target_user_id)).rejects.toThrow(
                new ConflictException(ERROR_MESSAGES.NOT_FOLLOWED)
            );

            expect(delete_follow_spy).toHaveBeenCalledWith(current_user_id, target_user_id);
            expect(delete_follow_spy).toHaveBeenCalledTimes(1);
        });
    });

    describe('removeFollower', () => {
        it('should successfully unfollow a user', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';

            const mock_result: DeleteResult = { affected: 1, raw: [] };

            const delete_follow_spy = jest
                .spyOn(user_repository, 'deleteFollowRelationship')
                .mockResolvedValue(mock_result);

            await service.removeFollower(current_user_id, target_user_id);

            expect(delete_follow_spy).toHaveBeenCalledWith(target_user_id, current_user_id);
            expect(delete_follow_spy).toHaveBeenCalledTimes(1);
        });

        it('should throw BadRequestException when trying to unfollow yourself', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';

            const delete_follow_spy = jest
                .spyOn(user_repository, 'deleteFollowRelationship')
                .mockResolvedValueOnce({} as any);

            await expect(service.removeFollower(current_user_id, current_user_id)).rejects.toThrow(
                new BadRequestException(ERROR_MESSAGES.CANNOT_REMOVE_SELF)
            );

            expect(delete_follow_spy).not.toHaveBeenCalled();
        });

        it('should throw ConflictException when not following the user', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';

            const mock_result: DeleteResult = { affected: 0, raw: [] };

            const delete_follow_spy = jest
                .spyOn(user_repository, 'deleteFollowRelationship')
                .mockResolvedValue(mock_result);

            await expect(service.removeFollower(current_user_id, target_user_id)).rejects.toThrow(
                new ConflictException(ERROR_MESSAGES.NOT_A_FOLLOWER)
            );

            expect(delete_follow_spy).toHaveBeenCalledWith(target_user_id, current_user_id);
            expect(delete_follow_spy).toHaveBeenCalledTimes(1);
        });
    });

    describe('muteUser', () => {
        it('should successfully mute a user', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';

            const validate_spy = jest
                .spyOn(user_repository, 'validateRelationshipRequest')
                .mockResolvedValueOnce({
                    user_exists: true,
                    relationship_exists: false,
                });

            const insert_mute_spy = jest
                .spyOn(user_repository, 'insertMuteRelationship')
                .mockResolvedValueOnce({} as any);

            await service.muteUser(current_user_id, target_user_id);

            expect(validate_spy).toHaveBeenCalledWith(
                current_user_id,
                target_user_id,
                RelationshipType.MUTE
            );
            expect(validate_spy).toHaveBeenCalledTimes(1);
            expect(insert_mute_spy).toHaveBeenCalledWith(current_user_id, target_user_id);
            expect(insert_mute_spy).toHaveBeenCalledTimes(1);
        });

        it('should throw BadRequestException when trying to mute yourself', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';

            const insert_mute_spy = jest.spyOn(user_repository, 'insertMuteRelationship');

            await expect(service.muteUser(current_user_id, current_user_id)).rejects.toThrow(
                new BadRequestException(ERROR_MESSAGES.CANNOT_MUTE_YOURSELF)
            );

            expect(insert_mute_spy).not.toHaveBeenCalled();
        });

        it('should throw NotFoundException when target user does not exist', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';

            const validate_spy = jest
                .spyOn(user_repository, 'validateRelationshipRequest')
                .mockResolvedValueOnce({
                    user_exists: false,
                    relationship_exists: false,
                });

            const insert_mute_spy = jest.spyOn(user_repository, 'insertMuteRelationship');

            await expect(service.muteUser(current_user_id, target_user_id)).rejects.toThrow(
                new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND)
            );

            expect(insert_mute_spy).not.toHaveBeenCalled();

            expect(validate_spy).toHaveBeenCalledWith(
                current_user_id,
                target_user_id,
                RelationshipType.MUTE
            );
            expect(validate_spy).toHaveBeenCalledTimes(1);
        });

        it('should throw ConflictException when already muted', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';

            const validate_spy = jest
                .spyOn(user_repository, 'validateRelationshipRequest')
                .mockResolvedValueOnce({
                    user_exists: true,
                    relationship_exists: true,
                });

            const insert_mute_spy = jest.spyOn(user_repository, 'insertMuteRelationship');

            await expect(service.muteUser(current_user_id, target_user_id)).rejects.toThrow(
                new ConflictException(ERROR_MESSAGES.ALREADY_MUTED)
            );

            expect(insert_mute_spy).not.toHaveBeenCalled();

            expect(validate_spy).toHaveBeenCalledWith(
                current_user_id,
                target_user_id,
                RelationshipType.MUTE
            );
            expect(validate_spy).toHaveBeenCalledTimes(1);
        });
    });

    describe('unmuteUser', () => {
        it('should successfully unmute a user', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';

            const mock_result: DeleteResult = { affected: 1, raw: [] };

            const delete_mute_spy = jest
                .spyOn(user_repository, 'deleteMuteRelationship')
                .mockResolvedValue(mock_result);

            await service.unmuteUser(current_user_id, target_user_id);

            expect(delete_mute_spy).toHaveBeenCalledWith(current_user_id, target_user_id);
            expect(delete_mute_spy).toHaveBeenCalledTimes(1);
        });

        it('should throw BadRequestException when trying to unmute yourself', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';

            const delete_mute_spy = jest
                .spyOn(user_repository, 'deleteMuteRelationship')
                .mockResolvedValueOnce({} as any);

            await expect(service.unmuteUser(current_user_id, current_user_id)).rejects.toThrow(
                new BadRequestException(ERROR_MESSAGES.CANNOT_UNMUTE_YOURSELF)
            );

            expect(delete_mute_spy).not.toHaveBeenCalled();
        });

        it('should throw ConflictException when not muting the user', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';

            const mock_result: DeleteResult = { affected: 0, raw: [] };

            const delete_mute_spy = jest
                .spyOn(user_repository, 'deleteMuteRelationship')
                .mockResolvedValue(mock_result);

            await expect(service.unmuteUser(current_user_id, target_user_id)).rejects.toThrow(
                new ConflictException(ERROR_MESSAGES.NOT_MUTED)
            );

            expect(delete_mute_spy).toHaveBeenCalledWith(current_user_id, target_user_id);
            expect(delete_mute_spy).toHaveBeenCalledTimes(1);
        });
    });

    describe('block', () => {
        it('should successfully block a user', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';

            const validate_spy = jest
                .spyOn(user_repository, 'validateRelationshipRequest')
                .mockResolvedValueOnce({
                    user_exists: true,
                    relationship_exists: false,
                });

            const insert_block_spy = jest
                .spyOn(user_repository, 'insertBlockRelationship')
                .mockResolvedValueOnce({} as any);

            await service.blockUser(current_user_id, target_user_id);

            expect(validate_spy).toHaveBeenCalledWith(
                current_user_id,
                target_user_id,
                RelationshipType.BLOCK
            );
            expect(validate_spy).toHaveBeenCalledTimes(1);
            expect(insert_block_spy).toHaveBeenCalledWith(current_user_id, target_user_id);
            expect(insert_block_spy).toHaveBeenCalledTimes(1);
        });

        it('should throw BadRequestException when trying to block yourself', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';

            const insert_block_spy = jest.spyOn(user_repository, 'insertBlockRelationship');

            await expect(service.blockUser(current_user_id, current_user_id)).rejects.toThrow(
                new BadRequestException(ERROR_MESSAGES.CANNOT_BLOCK_YOURSELF)
            );

            expect(insert_block_spy).not.toHaveBeenCalled();
        });

        it('should throw NotFoundException when target user does not exist', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';

            const validate_spy = jest
                .spyOn(user_repository, 'validateRelationshipRequest')
                .mockResolvedValueOnce({
                    user_exists: false,
                    relationship_exists: false,
                });

            const insert_block_spy = jest.spyOn(user_repository, 'insertBlockRelationship');

            await expect(service.blockUser(current_user_id, target_user_id)).rejects.toThrow(
                new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND)
            );

            expect(insert_block_spy).not.toHaveBeenCalled();

            expect(validate_spy).toHaveBeenCalledWith(
                current_user_id,
                target_user_id,
                RelationshipType.BLOCK
            );
            expect(validate_spy).toHaveBeenCalledTimes(1);
        });

        it('should throw ConflictException when already blocked', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';

            const validate_spy = jest
                .spyOn(user_repository, 'validateRelationshipRequest')
                .mockResolvedValueOnce({
                    user_exists: true,
                    relationship_exists: true,
                });

            const insert_block_spy = jest.spyOn(user_repository, 'insertBlockRelationship');

            await expect(service.blockUser(current_user_id, target_user_id)).rejects.toThrow(
                new ConflictException(ERROR_MESSAGES.ALREADY_BLOCKED)
            );

            expect(insert_block_spy).not.toHaveBeenCalled();

            expect(validate_spy).toHaveBeenCalledWith(
                current_user_id,
                target_user_id,
                RelationshipType.BLOCK
            );
            expect(validate_spy).toHaveBeenCalledTimes(1);
        });
    });

    describe('unblockUser', () => {
        it('should successfully unblock a user', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';

            const mock_result: DeleteResult = { affected: 1, raw: [] };

            const delete_block_spy = jest
                .spyOn(user_repository, 'deleteBlockRelationship')
                .mockResolvedValue(mock_result);

            await service.unblockUser(current_user_id, target_user_id);

            expect(delete_block_spy).toHaveBeenCalledWith(current_user_id, target_user_id);
            expect(delete_block_spy).toHaveBeenCalledTimes(1);
        });

        it('should throw BadRequestException when trying to unblock yourself', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';

            const delete_block_spy = jest
                .spyOn(user_repository, 'deleteBlockRelationship')
                .mockResolvedValueOnce({} as any);

            await expect(service.unblockUser(current_user_id, current_user_id)).rejects.toThrow(
                new BadRequestException(ERROR_MESSAGES.CANNOT_UNBLOCK_YOURSELF)
            );

            expect(delete_block_spy).not.toHaveBeenCalled();
        });

        it('should throw ConflictException when not blocking the user', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';

            const mock_result: DeleteResult = { affected: 0, raw: [] };

            const delete_block_spy = jest
                .spyOn(user_repository, 'deleteBlockRelationship')
                .mockResolvedValue(mock_result);
            await expect(service.unblockUser(current_user_id, target_user_id)).rejects.toThrow(
                new ConflictException(ERROR_MESSAGES.NOT_BLOCKED)
            );

            expect(delete_block_spy).toHaveBeenCalledWith(current_user_id, target_user_id);
            expect(delete_block_spy).toHaveBeenCalledTimes(1);
        });
    });

    describe('updateUser', () => {
        it('should update user and return updated profile', async () => {
            const user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const update_user_dto: UpdateUserDto = {
                name: 'Updated Name',
                bio: 'Updated bio',
                avatar_url: 'https://cdn.app.com/profiles/updated.jpg',
            };

            const existing_user: User = {
                id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                name: 'Alyaa Ali',
                username: 'Alyaa242',
                password: 'hashed-password',
                email: 'example@gmail.com',
                created_at: new Date('2025-10-21T09:26:17.432Z'),
                updated_at: new Date('2025-10-21T09:26:17.432Z'),
                language: 'ar',
                bio: 'Software developer and tech enthusiast.',
                avatar_url: 'https://example.com/images/profile.jpg',
                cover_url: 'https://example.com/images/cover.jpg',
                birth_date: new Date('2003-05-14'),
                country: null,
                verified: false,
                online: false,
                followers: 10,
                following: 15,
                hashtags: [],
                tweets: [],
            };

            const updated_user: User = {
                id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                name: 'Updated Name',
                username: 'Alyaa242',
                password: 'hashed-password',
                email: 'example@gmail.com',
                created_at: new Date('2025-10-21T09:26:17.432Z'),
                updated_at: new Date('2025-10-21T09:26:17.432Z'),
                language: 'ar',
                bio: 'Updated bio',
                avatar_url: 'https://cdn.app.com/profiles/updated.jpg',
                cover_url: 'https://example.com/images/cover.jpg',
                birth_date: new Date('2003-05-14'),
                country: null,
                verified: false,
                online: false,
                followers: 10,
                following: 15,
                hashtags: [],
                tweets: [],
            };

            const mock_response: UserProfileDto = {
                user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                name: 'Updated Name',
                username: 'Alyaa242',
                bio: 'Updated bio',
                avatar_url: 'https://cdn.app.com/profiles/updated.jpg',
                cover_url: 'https://example.com/images/cover.jpg',
                country: null,
                created_at: new Date('2025-10-21T09:26:17.432Z'),
                followers_count: 10,
                following_count: 15,
            };

            const find_one_spy = jest
                .spyOn(user_repository, 'findOne')
                .mockResolvedValueOnce(existing_user);

            const save_spy = jest
                .spyOn(user_repository, 'save')
                .mockResolvedValueOnce(updated_user);

            const result = await service.updateUser(user_id, update_user_dto);

            expect(find_one_spy).toHaveBeenCalledWith({
                where: { id: user_id },
            });
            expect(find_one_spy).toHaveBeenCalledTimes(1);
            expect(save_spy).toHaveBeenCalledWith(updated_user);
            expect(save_spy).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_response);
        });

        it('should throw NotFoundException when user does not exist', async () => {
            const user_id = 'nonexistent-user-id';
            const update_user_dto: UpdateUserDto = {
                name: 'Updated Name',
            };

            const find_one_spy = jest.spyOn(user_repository, 'findOne').mockResolvedValueOnce(null);

            await expect(service.updateUser(user_id, update_user_dto)).rejects.toThrow(
                ERROR_MESSAGES.USER_NOT_FOUND
            );

            expect(find_one_spy).toHaveBeenCalledWith({
                where: { id: user_id },
            });
            expect(find_one_spy).toHaveBeenCalledTimes(1);
        });
    });

    describe('deleteUser', () => {
        it('should delete user successfully', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';

            const existing_user: User = {
                id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                name: 'Alyaa Ali',
                username: 'Alyaa242',
                password: 'hashed-password',
                email: 'example@gmail.com',
                created_at: new Date('2025-10-21T09:26:17.432Z'),
                updated_at: new Date('2025-10-21T09:26:17.432Z'),
                language: 'ar',
                bio: 'Software developer and tech enthusiast.',
                avatar_url: 'https://example.com/images/profile.jpg',
                cover_url: 'https://example.com/images/cover.jpg',
                birth_date: new Date('2003-05-14'),
                country: null,
                verified: false,
                online: false,
                followers: 10,
                following: 15,
                hashtags: [],
                tweets: [],
            };

            const find_one_spy = jest
                .spyOn(user_repository, 'findOne')
                .mockResolvedValueOnce(existing_user);

            const delete_spy = jest
                .spyOn(user_repository, 'delete')
                .mockResolvedValueOnce({ affected: 1, raw: {} });

            await service.deleteUser(current_user_id);

            expect(find_one_spy).toHaveBeenCalledWith({
                where: { id: current_user_id },
            });
            expect(find_one_spy).toHaveBeenCalledTimes(1);
            expect(delete_spy).toHaveBeenCalledWith(current_user_id);
            expect(delete_spy).toHaveBeenCalledTimes(1);
        });

        it('should throw NotFoundException when user does not exist', async () => {
            const current_user_id = 'nonexistent-user-id';

            const find_one_spy = jest.spyOn(user_repository, 'findOne').mockResolvedValueOnce(null);

            await expect(service.deleteUser(current_user_id)).rejects.toThrow(
                ERROR_MESSAGES.USER_NOT_FOUND
            );

            expect(find_one_spy).toHaveBeenCalledWith({
                where: { id: current_user_id },
            });
            expect(find_one_spy).toHaveBeenCalledTimes(1);
        });
    });

    describe('uploadAvatar', () => {
        it('should upload avatar successfully and return file info', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const file = {
                fieldname: 'file',
                originalname: 'avatar.jpg',
                encoding: '7bit',
                mimetype: 'image/jpeg',
                size: 1024,
                buffer: Buffer.from('fake-image-data'),
            } as Express.Multer.File;

            const generated_file_name = `${current_user_id}_avatar.jpg`;
            const uploaded_image_url = 'https://cdn.app.com/profiles/avatar.jpg';
            const container_name = 'container-name';

            const mock_response: UploadFileResponseDto = {
                image_url: uploaded_image_url,
                image_name: generated_file_name,
            };

            const generate_file_name_spy = jest
                .spyOn(azure_storage_service, 'generateFileName')
                .mockReturnValue(generated_file_name);

            const config_get_spy = jest
                .spyOn(config_service, 'get')
                .mockReturnValue(container_name);

            const upload_file_spy = jest
                .spyOn(azure_storage_service, 'uploadFile')
                .mockResolvedValueOnce(uploaded_image_url);

            const result = await service.uploadAvatar(current_user_id, file);

            expect(generate_file_name_spy).toHaveBeenCalledWith(current_user_id, file.originalname);
            expect(generate_file_name_spy).toHaveBeenCalledTimes(1);
            expect(config_get_spy).toHaveBeenCalledWith('AZURE_STORAGE_PROFILE_IMAGE_CONTAINER');
            expect(upload_file_spy).toHaveBeenCalledWith(
                file.buffer,
                generated_file_name,
                container_name
            );
            expect(upload_file_spy).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_response);
        });

        it('should throw BadRequestException when file is not provided', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const file = null as any;

            await expect(service.uploadAvatar(current_user_id, file)).rejects.toThrow(
                ERROR_MESSAGES.FILE_NOT_FOUND
            );
        });

        it('should throw BadRequestException when file buffer is missing', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const file = {
                fieldname: 'file',
                originalname: 'avatar.jpg',
                encoding: '7bit',
                mimetype: 'image/jpeg',
                size: 1024,
                buffer: null,
            } as any;

            await expect(service.uploadAvatar(current_user_id, file)).rejects.toThrow(
                ERROR_MESSAGES.FILE_NOT_FOUND
            );
        });

        it('should throw InternalServerErrorException when upload fails', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const file = {
                fieldname: 'file',
                originalname: 'avatar.jpg',
                encoding: '7bit',
                mimetype: 'image/jpeg',
                size: 1024,
                buffer: Buffer.from('fake-image-data'),
            } as Express.Multer.File;

            const generated_file_name = `${current_user_id}_avatar.jpg`;
            const container_name = 'profile-images';

            jest.spyOn(azure_storage_service, 'generateFileName').mockReturnValue(
                generated_file_name
            );

            jest.spyOn(config_service, 'get').mockReturnValue(container_name);

            const upload_file_spy = jest
                .spyOn(azure_storage_service, 'uploadFile')
                .mockRejectedValueOnce(new Error('Upload failed'));

            await expect(service.uploadAvatar(current_user_id, file)).rejects.toThrow(
                ERROR_MESSAGES.FILE_UPLOAD_FAILED
            );

            expect(upload_file_spy).toHaveBeenCalledWith(
                file.buffer,
                generated_file_name,
                container_name
            );
            expect(upload_file_spy).toHaveBeenCalledTimes(1);
        });
    });

    describe('deleteAvatar', () => {
        it('should delete avatar successfully', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const delete_file_dto: DeleteFileDto = {
                file_url:
                    'https://yapperdev.blob.core.windows.net/profile-images/0c059899-f706-4c8f-97d7-ba2e9fc22d6d-1761902534288-kurosensi.png',
            };

            const file_name = `${current_user_id}-1761902534288-kurosensi.png`;
            const container_name = 'container-name';

            const extract_file_name_spy = jest
                .spyOn(azure_storage_service, 'extractFileName')
                .mockReturnValue(file_name);

            const extract_user_id_spy = jest
                .spyOn(azure_storage_service, 'extractUserIdFromFileName')
                .mockReturnValue(current_user_id);

            const config_get_spy = jest
                .spyOn(config_service, 'get')
                .mockReturnValue(container_name);

            const delete_file_spy = jest
                .spyOn(azure_storage_service, 'deleteFile')
                .mockResolvedValueOnce(undefined);

            await service.deleteAvatar(current_user_id, delete_file_dto);

            expect(extract_file_name_spy).toHaveBeenCalledWith(delete_file_dto.file_url);
            expect(extract_file_name_spy).toHaveBeenCalledTimes(1);
            expect(extract_user_id_spy).toHaveBeenCalledWith(file_name);
            expect(extract_user_id_spy).toHaveBeenCalledTimes(1);
            expect(config_get_spy).toHaveBeenCalledWith('AZURE_STORAGE_PROFILE_IMAGE_CONTAINER');
            expect(delete_file_spy).toHaveBeenCalledWith(file_name, container_name);
            expect(delete_file_spy).toHaveBeenCalledTimes(1);
        });

        it('should throw ForbiddenException when user tries to delete another users file', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const other_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';
            const delete_file_dto: DeleteFileDto = {
                file_url:
                    'https://yapperdev.blob.core.windows.net/profile-images/b2d59899-f706-4c8f-97d7-ba2e9fc22d90-1761902534288-kurosensi.png',
            };

            const file_name = `${other_user_id}-1761902534288-kurosensi.png`;

            const extract_file_name_spy = jest
                .spyOn(azure_storage_service, 'extractFileName')
                .mockReturnValue(file_name);

            const extract_user_id_spy = jest
                .spyOn(azure_storage_service, 'extractUserIdFromFileName')
                .mockReturnValue(other_user_id);

            await expect(service.deleteAvatar(current_user_id, delete_file_dto)).rejects.toThrow(
                ERROR_MESSAGES.UNAUTHORIZED_FILE_DELETE
            );

            expect(extract_file_name_spy).toHaveBeenCalledWith(delete_file_dto.file_url);
            expect(extract_file_name_spy).toHaveBeenCalledTimes(1);
            expect(extract_user_id_spy).toHaveBeenCalledWith(file_name);
            expect(extract_user_id_spy).toHaveBeenCalledTimes(1);
        });
    });

    describe('uploadCover', () => {
        it('should upload cover successfully and return file info', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const file = {
                fieldname: 'file',
                originalname: 'avatar.jpg',
                encoding: '7bit',
                mimetype: 'image/jpeg',
                size: 1024,
                buffer: Buffer.from('fake-image-data'),
            } as Express.Multer.File;

            const generated_file_name = `${current_user_id}_avatar.jpg`;
            const uploaded_image_url = 'https://cdn.app.com/profiles/avatar.jpg';
            const container_name = 'container-name';

            const mock_response: UploadFileResponseDto = {
                image_url: uploaded_image_url,
                image_name: generated_file_name,
            };

            const generate_file_name_spy = jest
                .spyOn(azure_storage_service, 'generateFileName')
                .mockReturnValue(generated_file_name);

            const config_get_spy = jest
                .spyOn(config_service, 'get')
                .mockReturnValue(container_name);

            const upload_file_spy = jest
                .spyOn(azure_storage_service, 'uploadFile')
                .mockResolvedValueOnce(uploaded_image_url);

            const result = await service.uploadCover(current_user_id, file);

            expect(generate_file_name_spy).toHaveBeenCalledWith(current_user_id, file.originalname);
            expect(generate_file_name_spy).toHaveBeenCalledTimes(1);
            expect(config_get_spy).toHaveBeenCalledWith('AZURE_STORAGE_COVER_IMAGE_CONTAINER');
            expect(upload_file_spy).toHaveBeenCalledWith(
                file.buffer,
                generated_file_name,
                container_name
            );
            expect(upload_file_spy).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_response);
        });

        it('should throw BadRequestException when file is not provided', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const file = null as any;

            await expect(service.uploadCover(current_user_id, file)).rejects.toThrow(
                ERROR_MESSAGES.FILE_NOT_FOUND
            );
        });

        it('should throw BadRequestException when file buffer is missing', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const file = {
                fieldname: 'file',
                originalname: 'avatar.jpg',
                encoding: '7bit',
                mimetype: 'image/jpeg',
                size: 1024,
                buffer: null,
            } as any;

            await expect(service.uploadCover(current_user_id, file)).rejects.toThrow(
                ERROR_MESSAGES.FILE_NOT_FOUND
            );
        });

        it('should throw InternalServerErrorException when upload fails', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const file = {
                fieldname: 'file',
                originalname: 'avatar.jpg',
                encoding: '7bit',
                mimetype: 'image/jpeg',
                size: 1024,
                buffer: Buffer.from('fake-image-data'),
            } as Express.Multer.File;

            const generated_file_name = `${current_user_id}_avatar.jpg`;
            const container_name = 'profile-images';

            jest.spyOn(azure_storage_service, 'generateFileName').mockReturnValue(
                generated_file_name
            );

            jest.spyOn(config_service, 'get').mockReturnValue(container_name);

            const upload_file_spy = jest
                .spyOn(azure_storage_service, 'uploadFile')
                .mockRejectedValueOnce(new Error('Upload failed'));

            await expect(service.uploadCover(current_user_id, file)).rejects.toThrow(
                ERROR_MESSAGES.FILE_UPLOAD_FAILED
            );

            expect(upload_file_spy).toHaveBeenCalledWith(
                file.buffer,
                generated_file_name,
                container_name
            );
            expect(upload_file_spy).toHaveBeenCalledTimes(1);
        });
    });

    describe('deleteCover', () => {
        it('should delete cover successfully', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const delete_file_dto: DeleteFileDto = {
                file_url:
                    'https://yapperdev.blob.core.windows.net/profile-images/0c059899-f706-4c8f-97d7-ba2e9fc22d6d-1761902534288-kurosensi.png',
            };

            const file_name = `${current_user_id}-1761902534288-kurosensi.png`;
            const container_name = 'container-name';

            const extract_file_name_spy = jest
                .spyOn(azure_storage_service, 'extractFileName')
                .mockReturnValue(file_name);

            const extract_user_id_spy = jest
                .spyOn(azure_storage_service, 'extractUserIdFromFileName')
                .mockReturnValue(current_user_id);

            const config_get_spy = jest
                .spyOn(config_service, 'get')
                .mockReturnValue(container_name);

            const delete_file_spy = jest
                .spyOn(azure_storage_service, 'deleteFile')
                .mockResolvedValueOnce(undefined);

            await service.deleteCover(current_user_id, delete_file_dto);

            expect(extract_file_name_spy).toHaveBeenCalledWith(delete_file_dto.file_url);
            expect(extract_file_name_spy).toHaveBeenCalledTimes(1);
            expect(extract_user_id_spy).toHaveBeenCalledWith(file_name);
            expect(extract_user_id_spy).toHaveBeenCalledTimes(1);
            expect(config_get_spy).toHaveBeenCalledWith('AZURE_STORAGE_COVER_IMAGE_CONTAINER');
            expect(delete_file_spy).toHaveBeenCalledWith(file_name, container_name);
            expect(delete_file_spy).toHaveBeenCalledTimes(1);
        });

        it('should throw ForbiddenException when user tries to delete another users file', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const other_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';
            const delete_file_dto: DeleteFileDto = {
                file_url:
                    'https://yapperdev.blob.core.windows.net/profile-images/b2d59899-f706-4c8f-97d7-ba2e9fc22d90-1761902534288-kurosensi.png',
            };

            const file_name = `${other_user_id}-1761902534288-kurosensi.png`;

            const extract_file_name_spy = jest
                .spyOn(azure_storage_service, 'extractFileName')
                .mockReturnValue(file_name);

            const extract_user_id_spy = jest
                .spyOn(azure_storage_service, 'extractUserIdFromFileName')
                .mockReturnValue(other_user_id);

            await expect(service.deleteCover(current_user_id, delete_file_dto)).rejects.toThrow(
                ERROR_MESSAGES.UNAUTHORIZED_FILE_DELETE
            );

            expect(extract_file_name_spy).toHaveBeenCalledWith(delete_file_dto.file_url);
            expect(extract_file_name_spy).toHaveBeenCalledTimes(1);
            expect(extract_user_id_spy).toHaveBeenCalledWith(file_name);
            expect(extract_user_id_spy).toHaveBeenCalledTimes(1);
        });
    });

    describe('assignInterests', () => {
        it('should assign interests to user successfully', async () => {
            const user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const assign_interests_dto: AssignInterestsDto = {
                category_ids: [1, 2],
            };

            const existing_categories: Category[] = [
                { id: 1, name: 'music' },
                { id: 2, name: 'sports' },
            ];

            const user_interests = [
                {
                    user_id,
                    category_id: 1,
                },
                {
                    user_id,
                    category_id: 2,
                },
            ];

            const find_by_spy = jest
                .spyOn(category_repository, 'findBy')
                .mockResolvedValueOnce(existing_categories);

            const insert_user_interests_spy = jest
                .spyOn(user_repository, 'insertUserInterests')
                .mockResolvedValueOnce({} as any);

            await service.assignInterests(user_id, assign_interests_dto);

            expect(find_by_spy).toHaveBeenCalledWith({
                id: In(assign_interests_dto.category_ids),
            });
            expect(find_by_spy).toHaveBeenCalledTimes(1);
            expect(insert_user_interests_spy).toHaveBeenCalledWith(user_interests);
            expect(insert_user_interests_spy).toHaveBeenCalledTimes(1);
        });

        it('should throw NotFoundException when some categories do not exist', async () => {
            const user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const assign_interests_dto: AssignInterestsDto = {
                category_ids: [1, 3],
            };

            const existing_categories: Category[] = [{ id: 1, name: 'music' }];

            const find_by_spy = jest
                .spyOn(category_repository, 'findBy')
                .mockResolvedValueOnce(existing_categories);

            await expect(service.assignInterests(user_id, assign_interests_dto)).rejects.toThrow(
                ERROR_MESSAGES.CATEGORIES_NOT_FOUND
            );

            expect(find_by_spy).toHaveBeenCalledWith({
                id: In(assign_interests_dto.category_ids),
            });
            expect(find_by_spy).toHaveBeenCalledTimes(1);
        });

        it('should throw NotFoundException when no categories exist', async () => {
            const user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const assign_interests_dto: AssignInterestsDto = {
                category_ids: [5, 6],
            };

            const existing_categories: Category[] = [];
            const find_by_spy = jest
                .spyOn(category_repository, 'findBy')
                .mockResolvedValueOnce(existing_categories);

            await expect(service.assignInterests(user_id, assign_interests_dto)).rejects.toThrow(
                ERROR_MESSAGES.CATEGORIES_NOT_FOUND
            );

            expect(find_by_spy).toHaveBeenCalledWith({
                id: In(assign_interests_dto.category_ids),
            });
            expect(find_by_spy).toHaveBeenCalledTimes(1);
        });
    });

    describe('changeLanguage', () => {
        it('should change user language successfully', async () => {
            const user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const change_language_dto: ChangeLanguageDto = {
                language: 'ar',
            };

            const mock_response: ChangeLanguageResponseDto = { language: 'ar' };

            const existing_user: User = {
                id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                name: 'Alyaa Ali',
                username: 'Alyaa242',
                password: 'hashed-password',
                email: 'example@gmail.com',
                created_at: new Date('2025-10-21T09:26:17.432Z'),
                updated_at: new Date('2025-10-21T09:26:17.432Z'),
                language: 'en',
                bio: 'Software developer and tech enthusiast.',
                avatar_url: 'https://example.com/images/profile.jpg',
                cover_url: 'https://example.com/images/cover.jpg',
                birth_date: new Date('2003-05-14'),
                country: null,
                verified: false,
                online: false,
                followers: 10,
                following: 15,
                hashtags: [],
                tweets: [],
            };

            const updated_user = {
                ...existing_user,
                language: 'ar',
            };

            const find_one_spy = jest
                .spyOn(user_repository, 'findOne')
                .mockResolvedValueOnce(existing_user);

            const save_spy = jest
                .spyOn(user_repository, 'save')
                .mockResolvedValueOnce(updated_user);

            const result = await service.changeLanguage(user_id, change_language_dto);

            expect(find_one_spy).toHaveBeenCalledWith({ where: { id: user_id } });
            expect(find_one_spy).toHaveBeenCalledTimes(1);
            expect(save_spy).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: user_id,
                    language: 'ar',
                })
            );
            expect(save_spy).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_response);
        });

        it('should throw NotFoundException when user does not exist', async () => {
            const user_id = 'nonexistent-user-id';
            const change_language_dto: ChangeLanguageDto = {
                language: 'ar',
            };

            const find_one_spy = jest.spyOn(user_repository, 'findOne').mockResolvedValueOnce(null);

            await expect(service.changeLanguage(user_id, change_language_dto)).rejects.toThrow(
                ERROR_MESSAGES.USER_NOT_FOUND
            );

            expect(find_one_spy).toHaveBeenCalledWith({ where: { id: user_id } });
            expect(find_one_spy).toHaveBeenCalledTimes(1);
        });
    });
    // describe('findUserById', () => {
    //     it('should find a user by ID', async () => {
    //         const mockUser = { id: '1', email: 'a@a.com' } as User;
    //         repo.findOne.mockResolvedValueOnce(mockUser);

    //         const result = await service.findUserById('1');

    //         expect(repo.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
    //         expect(result).toBe(mockUser);
    //     });
    // });

    // describe('findUserByEmail', () => {
    //     it('should find a user by email', async () => {
    //         const mockUser = { id: '2', email: 'test@example.com' } as User;
    //         repo.findOne.mockResolvedValueOnce(mockUser);

    //         const result = await service.findUserByEmail('test@example.com');

    //         expect(repo.findOne).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
    //         expect(result).toBe(mockUser);
    //     });
    // });

    // describe('findUserByGithubId', () => {
    //     it('should find a user by github_id', async () => {
    //         const mockUser = { id: '3', github_id: 'gh123' } as User;
    //         repo.findOne.mockResolvedValueOnce(mockUser);

    //         const result = await service.findUserByGithubId('gh123');

    //         expect(repo.findOne).toHaveBeenCalledWith({ where: { github_id: 'gh123' } });
    //         expect(result).toBe(mockUser);
    //     });
    // });

    // describe('findUserByFacebookId', () => {
    //     it('should find a user by facebookId', async () => {
    //         const mockUser = { id: '4', facebook_id: 'fb123' } as User;
    //         repo.findOne.mockResolvedValueOnce(mockUser);

    //         const result = await service.findUserByFacebookId('fb123');

    //         expect(repo.findOne).toHaveBeenCalledWith({ where: { facebook_id: 'fb123' } });
    //         expect(result).toBe(mockUser);
    //     });
    // });

    // describe('findUserByGoogleId', () => {
    //     it('should find a user by googleId', async () => {
    //         const mockUser = { id: '5', google_id: 'g123' } as User;
    //         repo.findOne.mockResolvedValueOnce(mockUser);

    //         const result = await service.findUserByGoogleId('g123');

    //         expect(repo.findOne).toHaveBeenCalledWith({ where: { google_id: 'g123' } });
    //         expect(result).toBe(mockUser);
    //     });
    // });

    // describe('createUser', () => {
    //     it('should create and save a new user', async () => {
    //         const createUserDto = { email: 'new@example.com' } as any;
    //         const savedUser = { id: '10', email: 'new@example.com' } as User;
    //         repo.save.mockResolvedValueOnce(savedUser);

    //         const result = await service.createUser(createUserDto);

    //         expect(repo.save).toHaveBeenCalledWith(expect.objectContaining(createUserDto));
    //         expect(result).toEqual(savedUser);
    //     });
    // });

    // describe('updateUser', () => {
    //     it('should update and return user', async () => {
    //         const updatedUser = {
    //             id: '1',
    //             name: 'Updated User',
    //             username: 'updateduser',
    //             email: 'test@example.com',
    //             password: 'hashedpassword',
    //             phone_number: '1234567890',
    //         } as User;
    //         (repo.update as jest.Mock).mockResolvedValueOnce(undefined);
    //         repo.findOne.mockResolvedValueOnce(updatedUser);

    //         const result = await service.updateUser('1', { name: 'Updated User' });

    //         expect(repo.update).toHaveBeenCalledWith('1', { name: 'Updated User' });
    //         expect(result).toEqual(updatedUser);
    //     });
    // });

    // describe('updateUserPassword', () => {
    //     it('should update password and return user', async () => {
    //         const updatedUser = { id: '1', password: 'hashed' } as User;
    //         (repo.update as jest.Mock).mockResolvedValueOnce(undefined);
    //         repo.findOne.mockResolvedValueOnce(updatedUser);

    //         const result = await service.updateUserPassword('1', 'hashed');

    //         expect(repo.update).toHaveBeenCalledWith('1', { password: 'hashed' });
    //         expect(result).toEqual(updatedUser);
    //     });
    // });
});
