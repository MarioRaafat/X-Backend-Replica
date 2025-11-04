import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { OptionalJwtAuthGuard } from 'src/auth/guards/optional-jwt.guard';
import { UserProfileDto } from './dto/user-profile.dto';
import { DetailedUserProfileDto } from './dto/detailed-user-profile.dto';
import { UserListItemDto } from './dto/user-list-item.dto';
import { GetFollowersDto } from './dto/get-followers.dto';
import { PaginationParamsDto } from './dto/pagination-params.dto';
import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    NotFoundException,
} from '@nestjs/common';
import { ERROR_MESSAGES } from 'src/constants/swagger-messages';
import { GetUsersByIdDto } from './dto/get-users-by-id.dto';
import { GetUsersByUsernameDto } from './dto/get-users-by-username.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangeLanguageResponseDto } from './dto/change-language-response.dto';
import { ChangeLanguageDto } from './dto/change-language.dto';
import { UploadFileResponseDto } from './dto/upload-file-response.dto';
import { Readable } from 'stream';
import { DeleteFileDto } from './dto/delete-file.dto';
import { AssignInterestsDto } from './dto/assign-interests.dto';

describe('UserController', () => {
    let controller: UserController;
    let user_service: jest.Mocked<UserService>;

    beforeEach(async () => {
        const mock_user_service = {
            getUsersByIds: jest.fn(),
            getUsersByUsernames: jest.fn(),
            getMe: jest.fn(),
            getUserById: jest.fn(),
            getUserByUsername: jest.fn(),
            getFollowers: jest.fn(),
            getFollowing: jest.fn(),
            followUser: jest.fn(),
            unfollowUser: jest.fn(),
            removeFollower: jest.fn(),
            muteUser: jest.fn(),
            unmuteUser: jest.fn(),
            blockUser: jest.fn(),
            unblockUser: jest.fn(),
            getMutedList: jest.fn(),
            getBlockedList: jest.fn(),
            getPosts: jest.fn(),
            getLikedPosts: jest.fn(),
            getMedia: jest.fn(),
            getReplies: jest.fn(),
            updateUser: jest.fn(),
            deleteUser: jest.fn(),
            uploadAvatar: jest.fn(),
            deleteAvatar: jest.fn(),
            uploadCover: jest.fn(),
            deleteCover: jest.fn(),
            assignInterests: jest.fn(),
            changeLanguage: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [UserController],
            providers: [{ provide: UserService, useValue: mock_user_service }],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue({ canActivate: jest.fn(() => true) })
            .overrideGuard(OptionalJwtAuthGuard)
            .useValue({ canActivate: jest.fn(() => true) })
            .compile();

        controller = module.get<UserController>(UserController);
        user_service = module.get(UserService);
    });

    afterEach(() => jest.clearAllMocks());

    describe('getUsersByIds', () => {
        it('should call user_service.getUsersByIds with the current user id and dto', async () => {
            const mock_response = [
                {
                    identifier: '1a8e9906-65bb-4fa4-a614-ecc6a434ee94',
                    success: true,
                    user: {
                        user_id: '1a8e9906-65bb-4fa4-a614-ecc6a434ee94',
                        name: 'Grok',
                        username: 'grok',
                        bio: 'grok it',
                        avatar_url:
                            'https://pbs.twimg.com/profile_images/1893219113717342208/Vgg2hEPa_normal.jpg',
                        is_following: false,
                        is_follower: false,
                        is_muted: false,
                        is_blocked: false,
                        verified: false,
                        followers: 0,
                        following: 0,
                    },
                },
                {
                    identifier: '1a8e9906-65bb-4fa4-a614-ecc6a434ee94',
                    success: false,
                    user: null,
                },
            ];

            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const get_users_by_id_dto: GetUsersByIdDto = {
                ids: [
                    '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                    'b2d59899-f706-4c8f-97d7-ba2e9fc22d90',
                ],
            };

            const get_users_by_ids = jest
                .spyOn(user_service, 'getUsersByIds')
                .mockResolvedValueOnce(mock_response);

            const result = await controller.getUsersByIds(current_user_id, get_users_by_id_dto);

            expect(get_users_by_ids).toHaveBeenCalledWith(current_user_id, get_users_by_id_dto);
            expect(get_users_by_ids).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_response);
        });

        it('should call user_service.getUsersByIds with dto only', async () => {
            const mock_response = [
                {
                    identifier: '1a8e9906-65bb-4fa4-a614-ecc6a434ee94',
                    success: true,
                    user: {
                        user_id: '1a8e9906-65bb-4fa4-a614-ecc6a434ee94',
                        name: 'Grok',
                        username: 'grok',
                        bio: 'grok it',
                        avatar_url:
                            'https://pbs.twimg.com/profile_images/1893219113717342208/Vgg2hEPa_normal.jpg',
                        is_following: false,
                        is_follower: false,
                        is_muted: false,
                        is_blocked: false,
                        verified: false,
                        followers: 0,
                        following: 0,
                    },
                },
                {
                    identifier: '1a8e9906-65bb-4fa4-a614-ecc6a434ee94',
                    success: false,
                    user: null,
                },
            ];

            const current_user_id = null;
            const get_users_by_id_dto: GetUsersByIdDto = {
                ids: ['0c059899-f706-4c8f-97d7-ba2e9fc22d6d'],
            };

            const get_users_by_ids = jest
                .spyOn(user_service, 'getUsersByIds')
                .mockResolvedValueOnce(mock_response);

            const result = await controller.getUsersByIds(current_user_id, get_users_by_id_dto);

            expect(get_users_by_ids).toHaveBeenCalledWith(current_user_id, get_users_by_id_dto);
            expect(get_users_by_ids).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_response);
        });
    });

    describe('getUsersByUsernames', () => {
        it('should call user_service.getUsersByUsernames with the current user id and dto', async () => {
            const mock_response = [
                {
                    identifier: 'grok',
                    success: true,
                    user: {
                        user_id: '1a8e9906-65bb-4fa4-a614-ecc6a434ee94',
                        name: 'Grok',
                        username: 'grok',
                        bio: 'grok it',
                        avatar_url:
                            'https://pbs.twimg.com/profile_images/1893219113717342208/Vgg2hEPa_normal.jpg',
                        is_following: false,
                        is_follower: false,
                        is_muted: false,
                        is_blocked: false,
                        verified: false,
                        followers: 0,
                        following: 0,
                    },
                },
                {
                    identifier: 'grok',
                    success: false,
                    user: null,
                },
            ];

            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const get_users_by_username_dto: GetUsersByUsernameDto = {
                usernames: ['grok', 'non-existing-username'],
            };

            const get_users_by_usernames = jest
                .spyOn(user_service, 'getUsersByUsernames')
                .mockResolvedValueOnce(mock_response);

            const result = await controller.getUsersByUsernames(
                current_user_id,
                get_users_by_username_dto
            );

            expect(get_users_by_usernames).toHaveBeenCalledWith(
                current_user_id,
                get_users_by_username_dto
            );
            expect(get_users_by_usernames).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_response);
        });

        it('should call user_service.getUsersByUsernames with dto only', async () => {
            const mock_response = [
                {
                    identifier: 'grok',
                    success: true,
                    user: {
                        user_id: '1a8e9906-65bb-4fa4-a614-ecc6a434ee94',
                        name: 'Grok',
                        username: 'grok',
                        bio: 'grok it',
                        avatar_url:
                            'https://pbs.twimg.com/profile_images/1893219113717342208/Vgg2hEPa_normal.jpg',
                        is_following: false,
                        is_follower: false,
                        is_muted: false,
                        is_blocked: false,
                        verified: false,
                        followers: 0,
                        following: 0,
                    },
                },
                {
                    identifier: 'grok',
                    success: false,
                    user: null,
                },
            ];

            const current_user_id = null;
            const get_users_by_username_dto: GetUsersByUsernameDto = {
                usernames: ['grok', 'non-existing-username'],
            };

            const get_users_by_usernames = jest
                .spyOn(user_service, 'getUsersByUsernames')
                .mockResolvedValueOnce(mock_response);

            const result = await controller.getUsersByUsernames(
                current_user_id,
                get_users_by_username_dto
            );

            expect(get_users_by_usernames).toHaveBeenCalledWith(
                current_user_id,
                get_users_by_username_dto
            );
            expect(get_users_by_usernames).toHaveBeenCalledTimes(1);
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

            const get_me_spy = jest
                .spyOn(user_service, 'getMe')
                .mockResolvedValueOnce(mock_response);

            const result = await controller.getMe(user_id);

            expect(get_me_spy).toHaveBeenCalledWith(user_id);
            expect(get_me_spy).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_response);
        });

        it('should throw if service throws', async () => {
            const user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';

            const error = new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);

            const get_me_spy = jest.spyOn(user_service, 'getMe').mockRejectedValueOnce(error);

            await expect(controller.getMe(user_id)).rejects.toThrow(ERROR_MESSAGES.USER_NOT_FOUND);

            expect(get_me_spy).toHaveBeenCalledWith(user_id);
            expect(get_me_spy).toHaveBeenCalledTimes(1);
        });
    });

    describe('getUserById', () => {
        it('should call user_service.getUserById with the current user id and target_user_id', async () => {
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

            const get_user_by_id = jest
                .spyOn(user_service, 'getUserById')
                .mockResolvedValueOnce(mock_response);

            const result = await controller.getUserById(current_user_id, target_user_id);

            expect(get_user_by_id).toHaveBeenCalledWith(current_user_id, target_user_id);
            expect(get_user_by_id).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_response);
        });

        it('should call user_service.getUserById with target_user_id only', async () => {
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
            };

            const current_user_id = null;
            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';

            const get_user_by_id = jest
                .spyOn(user_service, 'getUserById')
                .mockResolvedValueOnce(mock_response);

            const result = await controller.getUserById(current_user_id, target_user_id);

            expect(get_user_by_id).toHaveBeenCalledWith(current_user_id, target_user_id);
            expect(get_user_by_id).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_response);
        });

        it('should throw if service throws', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';

            const error = new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);

            const get_user_by_id = jest
                .spyOn(user_service, 'getUserById')
                .mockRejectedValueOnce(error);

            await expect(controller.getUserById(current_user_id, target_user_id)).rejects.toThrow(
                ERROR_MESSAGES.USER_NOT_FOUND
            );

            expect(get_user_by_id).toHaveBeenCalledWith(current_user_id, target_user_id);
            expect(get_user_by_id).toHaveBeenCalledTimes(1);
        });
    });

    describe('getUserByUsername', () => {
        it('should call user_service.getUserByUsername with the current user id and target_username', async () => {
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
            const target_username = 'alyaa242';

            const get_user_by_username = jest
                .spyOn(user_service, 'getUserByUsername')
                .mockResolvedValueOnce(mock_response);

            const result = await controller.getUserByUsername(current_user_id, target_username);

            expect(get_user_by_username).toHaveBeenCalledWith(current_user_id, target_username);
            expect(get_user_by_username).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_response);
        });

        it('should call user_service.getUserByUsername with target_username only', async () => {
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
            };

            const current_user_id = null;
            const target_username = 'alyaa242';

            const get_user_by_username = jest
                .spyOn(user_service, 'getUserByUsername')
                .mockResolvedValueOnce(mock_response);

            const result = await controller.getUserByUsername(current_user_id, target_username);

            expect(get_user_by_username).toHaveBeenCalledWith(current_user_id, target_username);
            expect(get_user_by_username).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_response);
        });

        it('should throw if service throws', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_username = 'alyaa242';

            const error = new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);

            const get_user_by_username = jest
                .spyOn(user_service, 'getUserByUsername')
                .mockRejectedValueOnce(error);

            await expect(
                controller.getUserByUsername(current_user_id, target_username)
            ).rejects.toThrow(ERROR_MESSAGES.USER_NOT_FOUND);

            expect(get_user_by_username).toHaveBeenCalledWith(current_user_id, target_username);
            expect(get_user_by_username).toHaveBeenCalledTimes(1);
        });
    });

    describe('getFollowers', () => {
        it('should call user_service.getFollowers with the current user id, target user id and getFollowersDto without following filter', async () => {
            const mock_response: UserListItemDto[] = [
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
                    verified: false,
                    followers: 0,
                    following: 0,
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
                    verified: false,
                    followers: 0,
                    following: 0,
                },
            ];

            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';
            const query_dto: GetFollowersDto = {
                page_offset: 0,
                page_size: 10,
            };

            const get_followers_spy = jest
                .spyOn(user_service, 'getFollowers')
                .mockResolvedValueOnce(mock_response);

            const result = await controller.getFollowers(
                current_user_id,
                target_user_id,
                query_dto
            );

            expect(get_followers_spy).toHaveBeenCalledWith(
                current_user_id,
                target_user_id,
                query_dto
            );
            expect(get_followers_spy).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_response);
        });
        it('should call user_service.getFollowers with the current user id, target user id and getFollowersDto with following filter', async () => {
            const mock_response: UserListItemDto[] = [
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
                    verified: false,
                    followers: 0,
                    following: 0,
                },
            ];

            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';
            const query_dto: GetFollowersDto = {
                page_offset: 0,
                page_size: 10,
                following: true,
            };

            const get_followers_spy = jest
                .spyOn(user_service, 'getFollowers')
                .mockResolvedValueOnce(mock_response);

            const result = await controller.getFollowers(
                current_user_id,
                target_user_id,
                query_dto
            );

            expect(get_followers_spy).toHaveBeenCalledWith(
                current_user_id,
                target_user_id,
                query_dto
            );
            expect(get_followers_spy).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_response);
        });

        it('should throw if service throws user not found', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';

            const query_dto: GetFollowersDto = {
                page_offset: 0,
                page_size: 10,
            };

            const error = new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);

            const get_followers = jest
                .spyOn(user_service, 'getFollowers')
                .mockRejectedValueOnce(error);

            await expect(
                controller.getFollowers(current_user_id, target_user_id, query_dto)
            ).rejects.toThrow(ERROR_MESSAGES.USER_NOT_FOUND);

            expect(get_followers).toHaveBeenCalledWith(current_user_id, target_user_id, query_dto);
            expect(get_followers).toHaveBeenCalledTimes(1);
        });
    });

    describe('getMutedList', () => {
        it('should call user_service.getMutedList with the current user id, target user id and queryDto', async () => {
            const mock_response: UserListItemDto[] = [
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
                    verified: false,
                    followers: 0,
                    following: 0,
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
                    verified: false,
                    followers: 0,
                    following: 0,
                },
            ];

            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const query_dto: PaginationParamsDto = {
                page_offset: 0,
                page_size: 10,
            };

            const get_muted_list = jest
                .spyOn(user_service, 'getMutedList')
                .mockResolvedValueOnce(mock_response);

            const result = await controller.getMutedList(current_user_id, query_dto);

            expect(get_muted_list).toHaveBeenCalledWith(current_user_id, query_dto);
            expect(get_muted_list).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_response);
        });
    });

    describe('getBlockedList', () => {
        it('should call user_service.getBlockedList with the current user id, target user id and queryDto', async () => {
            const mock_response: UserListItemDto[] = [
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
                    verified: false,
                    followers: 0,
                    following: 0,
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
                    verified: false,
                    followers: 0,
                    following: 0,
                },
            ];

            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const query_dto: PaginationParamsDto = {
                page_offset: 0,
                page_size: 10,
            };

            const get_blocked_list = jest
                .spyOn(user_service, 'getBlockedList')
                .mockResolvedValueOnce(mock_response);

            const result = await controller.getBlockedList(current_user_id, query_dto);

            expect(get_blocked_list).toHaveBeenCalledWith(current_user_id, query_dto);
            expect(get_blocked_list).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_response);
        });
    });

    describe('followUser', () => {
        it('should call user_service.followUser with the current user id and target_user_id', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';

            const follow_user = jest
                .spyOn(user_service, 'followUser')
                .mockResolvedValueOnce(undefined);

            const result = await controller.followUser(current_user_id, target_user_id);

            expect(follow_user).toHaveBeenCalledWith(current_user_id, target_user_id);
            expect(follow_user).toHaveBeenCalledTimes(1);
            expect(result).toEqual(undefined);
        });

        it('should throw if service throws cannot follow yourself', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';

            const error = new BadRequestException(ERROR_MESSAGES.CANNOT_FOLLOW_YOURSELF);

            const follow_user = jest.spyOn(user_service, 'followUser').mockRejectedValueOnce(error);

            await expect(controller.followUser(current_user_id, target_user_id)).rejects.toThrow(
                ERROR_MESSAGES.CANNOT_FOLLOW_YOURSELF
            );

            expect(follow_user).toHaveBeenCalledWith(current_user_id, target_user_id);
            expect(follow_user).toHaveBeenCalledTimes(1);
        });

        it('should throw if service throws user not found', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';

            const error = new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);

            const follow_user = jest.spyOn(user_service, 'followUser').mockRejectedValueOnce(error);

            await expect(controller.followUser(current_user_id, target_user_id)).rejects.toThrow(
                ERROR_MESSAGES.USER_NOT_FOUND
            );

            expect(follow_user).toHaveBeenCalledWith(current_user_id, target_user_id);
            expect(follow_user).toHaveBeenCalledTimes(1);
        });

        it('should throw if service throws already following', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';

            const error = new ConflictException(ERROR_MESSAGES.ALREADY_FOLLOWING);

            const follow_user = jest.spyOn(user_service, 'followUser').mockRejectedValueOnce(error);

            await expect(controller.followUser(current_user_id, target_user_id)).rejects.toThrow(
                ERROR_MESSAGES.ALREADY_FOLLOWING
            );

            expect(follow_user).toHaveBeenCalledWith(current_user_id, target_user_id);
            expect(follow_user).toHaveBeenCalledTimes(1);
        });

        it('should throw if service throws cannot follow user', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';

            const error = new ForbiddenException(ERROR_MESSAGES.CANNOT_FOLLOW_USER);

            const follow_user = jest.spyOn(user_service, 'followUser').mockRejectedValueOnce(error);

            await expect(controller.followUser(current_user_id, target_user_id)).rejects.toThrow(
                ERROR_MESSAGES.CANNOT_FOLLOW_USER
            );

            expect(follow_user).toHaveBeenCalledWith(current_user_id, target_user_id);
            expect(follow_user).toHaveBeenCalledTimes(1);
        });

        it('should throw if service throws cannot follow blocked user', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';

            const error = new BadRequestException(ERROR_MESSAGES.CANNOT_FOLLOW_BLOCKED_USER);

            const follow_user = jest.spyOn(user_service, 'followUser').mockRejectedValueOnce(error);

            await expect(controller.followUser(current_user_id, target_user_id)).rejects.toThrow(
                ERROR_MESSAGES.CANNOT_FOLLOW_BLOCKED_USER
            );

            expect(follow_user).toHaveBeenCalledWith(current_user_id, target_user_id);
            expect(follow_user).toHaveBeenCalledTimes(1);
        });
    });

    describe('unfollowUser', () => {
        it('should call user_service.unfollowUser with the current user id and target_user_id', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';

            const unfollow_user = jest
                .spyOn(user_service, 'unfollowUser')
                .mockResolvedValueOnce(undefined);

            const result = await controller.unfollowUser(current_user_id, target_user_id);

            expect(unfollow_user).toHaveBeenCalledWith(current_user_id, target_user_id);
            expect(unfollow_user).toHaveBeenCalledTimes(1);
            expect(result).toEqual(undefined);
        });

        it('should throw if service throws cannot unfollow yourself', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';

            const error = new BadRequestException(ERROR_MESSAGES.CANNOT_UNFOLLOW_YOURSELF);

            const unfollow_user = jest
                .spyOn(user_service, 'unfollowUser')
                .mockRejectedValueOnce(error);

            await expect(controller.unfollowUser(current_user_id, target_user_id)).rejects.toThrow(
                ERROR_MESSAGES.CANNOT_UNFOLLOW_YOURSELF
            );

            expect(unfollow_user).toHaveBeenCalledWith(current_user_id, target_user_id);
            expect(unfollow_user).toHaveBeenCalledTimes(1);
        });

        it('should throw if service throws not followed', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';

            const error = new ConflictException(ERROR_MESSAGES.NOT_FOLLOWED);

            const unfollow_user = jest
                .spyOn(user_service, 'unfollowUser')
                .mockRejectedValueOnce(error);

            await expect(controller.unfollowUser(current_user_id, target_user_id)).rejects.toThrow(
                ERROR_MESSAGES.NOT_FOLLOWED
            );

            expect(unfollow_user).toHaveBeenCalledWith(current_user_id, target_user_id);
            expect(unfollow_user).toHaveBeenCalledTimes(1);
        });
    });

    describe('removeFollower', () => {
        it('should call user_service.removeFollower with the current user id and target_user_id', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';

            const remove_follower = jest
                .spyOn(user_service, 'removeFollower')
                .mockResolvedValueOnce(undefined);

            const result = await controller.removeFollower(current_user_id, target_user_id);

            expect(remove_follower).toHaveBeenCalledWith(current_user_id, target_user_id);
            expect(remove_follower).toHaveBeenCalledTimes(1);
            expect(result).toEqual(undefined);
        });

        it('should throw if service throws cannot remove yourself', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';

            const error = new BadRequestException(ERROR_MESSAGES.CANNOT_REMOVE_SELF);

            const remove_follower = jest
                .spyOn(user_service, 'removeFollower')
                .mockRejectedValueOnce(error);

            await expect(
                controller.removeFollower(current_user_id, target_user_id)
            ).rejects.toThrow(ERROR_MESSAGES.CANNOT_REMOVE_SELF);

            expect(remove_follower).toHaveBeenCalledWith(current_user_id, target_user_id);
            expect(remove_follower).toHaveBeenCalledTimes(1);
        });

        it('should throw if service throws not a follower', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';

            const error = new ConflictException(ERROR_MESSAGES.NOT_A_FOLLOWER);

            const remove_follower = jest
                .spyOn(user_service, 'removeFollower')
                .mockRejectedValueOnce(error);

            await expect(
                controller.removeFollower(current_user_id, target_user_id)
            ).rejects.toThrow(ERROR_MESSAGES.NOT_A_FOLLOWER);

            expect(remove_follower).toHaveBeenCalledWith(current_user_id, target_user_id);
            expect(remove_follower).toHaveBeenCalledTimes(1);
        });
    });

    describe('muteUser', () => {
        it('should call user_service.muteUser with the current user id and target_user_id', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';

            const mute_user = jest.spyOn(user_service, 'muteUser').mockResolvedValueOnce(undefined);

            const result = await controller.muteUser(current_user_id, target_user_id);

            expect(mute_user).toHaveBeenCalledWith(current_user_id, target_user_id);
            expect(mute_user).toHaveBeenCalledTimes(1);
            expect(result).toEqual(undefined);
        });

        it('should throw if service throws cannot mute yourself', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';

            const error = new BadRequestException(ERROR_MESSAGES.CANNOT_MUTE_YOURSELF);

            const mute_user = jest.spyOn(user_service, 'muteUser').mockRejectedValueOnce(error);

            await expect(controller.muteUser(current_user_id, target_user_id)).rejects.toThrow(
                ERROR_MESSAGES.CANNOT_MUTE_YOURSELF
            );

            expect(mute_user).toHaveBeenCalledWith(current_user_id, target_user_id);
            expect(mute_user).toHaveBeenCalledTimes(1);
        });

        it('should throw if service throws user not found', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';

            const error = new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);

            const mute_user = jest.spyOn(user_service, 'muteUser').mockRejectedValueOnce(error);

            await expect(controller.muteUser(current_user_id, target_user_id)).rejects.toThrow(
                ERROR_MESSAGES.USER_NOT_FOUND
            );

            expect(mute_user).toHaveBeenCalledWith(current_user_id, target_user_id);
            expect(mute_user).toHaveBeenCalledTimes(1);
        });

        it('should throw if service throws already muted', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';

            const error = new ConflictException(ERROR_MESSAGES.ALREADY_MUTED);

            const mute_user = jest.spyOn(user_service, 'muteUser').mockRejectedValueOnce(error);

            await expect(controller.muteUser(current_user_id, target_user_id)).rejects.toThrow(
                ERROR_MESSAGES.ALREADY_MUTED
            );

            expect(mute_user).toHaveBeenCalledWith(current_user_id, target_user_id);
            expect(mute_user).toHaveBeenCalledTimes(1);
        });
    });

    describe('unmuteUser', () => {
        it('should call user_service.unmuteUser with the current user id and target_user_id', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';

            const unmute_user = jest
                .spyOn(user_service, 'unmuteUser')
                .mockResolvedValueOnce(undefined);

            const result = await controller.unmuteUser(current_user_id, target_user_id);

            expect(unmute_user).toHaveBeenCalledWith(current_user_id, target_user_id);
            expect(unmute_user).toHaveBeenCalledTimes(1);
            expect(result).toEqual(undefined);
        });

        it('should throw if service throws cannot unmute yourself', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';

            const error = new BadRequestException(ERROR_MESSAGES.CANNOT_UNMUTE_YOURSELF);

            const unmute_user = jest.spyOn(user_service, 'unmuteUser').mockRejectedValueOnce(error);

            await expect(controller.unmuteUser(current_user_id, target_user_id)).rejects.toThrow(
                ERROR_MESSAGES.CANNOT_UNMUTE_YOURSELF
            );

            expect(unmute_user).toHaveBeenCalledWith(current_user_id, target_user_id);
            expect(unmute_user).toHaveBeenCalledTimes(1);
        });

        it('should throw if service throws not muted', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';

            const error = new ConflictException(ERROR_MESSAGES.NOT_MUTED);

            const unmute_user = jest.spyOn(user_service, 'unmuteUser').mockRejectedValueOnce(error);

            await expect(controller.unmuteUser(current_user_id, target_user_id)).rejects.toThrow(
                ERROR_MESSAGES.NOT_MUTED
            );

            expect(unmute_user).toHaveBeenCalledWith(current_user_id, target_user_id);
            expect(unmute_user).toHaveBeenCalledTimes(1);
        });
    });

    describe('blockUser', () => {
        it('should call user_service.blockUser with the current user id and target_user_id', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';

            const block_user = jest
                .spyOn(user_service, 'blockUser')
                .mockResolvedValueOnce(undefined);

            const result = await controller.blockUser(current_user_id, target_user_id);

            expect(block_user).toHaveBeenCalledWith(current_user_id, target_user_id);
            expect(block_user).toHaveBeenCalledTimes(1);
            expect(result).toEqual(undefined);
        });

        it('should throw if service throws cannot block yourself', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';

            const error = new BadRequestException(ERROR_MESSAGES.CANNOT_BLOCK_YOURSELF);

            const block_user = jest.spyOn(user_service, 'blockUser').mockRejectedValueOnce(error);

            await expect(controller.blockUser(current_user_id, target_user_id)).rejects.toThrow(
                ERROR_MESSAGES.CANNOT_BLOCK_YOURSELF
            );

            expect(block_user).toHaveBeenCalledWith(current_user_id, target_user_id);
            expect(block_user).toHaveBeenCalledTimes(1);
        });

        it('should throw if service throws user not found', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';

            const error = new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);

            const block_user = jest.spyOn(user_service, 'blockUser').mockRejectedValueOnce(error);

            await expect(controller.blockUser(current_user_id, target_user_id)).rejects.toThrow(
                ERROR_MESSAGES.USER_NOT_FOUND
            );

            expect(block_user).toHaveBeenCalledWith(current_user_id, target_user_id);
            expect(block_user).toHaveBeenCalledTimes(1);
        });

        it('should throw if service throws already blocked', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';

            const error = new ConflictException(ERROR_MESSAGES.ALREADY_BLOCKED);

            const block_user = jest.spyOn(user_service, 'blockUser').mockRejectedValueOnce(error);

            await expect(controller.blockUser(current_user_id, target_user_id)).rejects.toThrow(
                ERROR_MESSAGES.ALREADY_BLOCKED
            );

            expect(block_user).toHaveBeenCalledWith(current_user_id, target_user_id);
            expect(block_user).toHaveBeenCalledTimes(1);
        });
    });

    describe('unblockUser', () => {
        it('should call user_service.unblockUser with the current user id and target_user_id', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';

            const unblock_user = jest
                .spyOn(user_service, 'unblockUser')
                .mockResolvedValueOnce(undefined);

            const result = await controller.unblockUser(current_user_id, target_user_id);

            expect(unblock_user).toHaveBeenCalledWith(current_user_id, target_user_id);
            expect(unblock_user).toHaveBeenCalledTimes(1);
            expect(result).toEqual(undefined);
        });

        it('should throw if service throws cannot unblock yourself', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';

            const error = new BadRequestException(ERROR_MESSAGES.CANNOT_UNBLOCK_YOURSELF);

            const unblock_user = jest
                .spyOn(user_service, 'unblockUser')
                .mockRejectedValueOnce(error);

            await expect(controller.unblockUser(current_user_id, target_user_id)).rejects.toThrow(
                ERROR_MESSAGES.CANNOT_UNBLOCK_YOURSELF
            );

            expect(unblock_user).toHaveBeenCalledWith(current_user_id, target_user_id);
            expect(unblock_user).toHaveBeenCalledTimes(1);
        });

        it('should throw if service throws not blocked', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';

            const error = new ConflictException(ERROR_MESSAGES.NOT_BLOCKED);

            const unblock_user = jest
                .spyOn(user_service, 'unblockUser')
                .mockRejectedValueOnce(error);

            await expect(controller.unblockUser(current_user_id, target_user_id)).rejects.toThrow(
                ERROR_MESSAGES.NOT_BLOCKED
            );

            expect(unblock_user).toHaveBeenCalledWith(current_user_id, target_user_id);
            expect(unblock_user).toHaveBeenCalledTimes(1);
        });
    });

    describe('getLikedPosts', () => {
        it('should call user_service.getLikedPosts with the current user id and query dto', async () => {
            const mock_response: any = {
                data: [],
            };

            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const query_dto: PaginationParamsDto = {
                page_offset: 0,
                page_size: 10,
            };

            const get_liked_posts = jest
                .spyOn(user_service, 'getLikedPosts')
                .mockResolvedValueOnce(mock_response);

            const result = await controller.getLikedPosts(current_user_id, query_dto);

            expect(get_liked_posts).toHaveBeenCalledWith(current_user_id, query_dto);
            expect(get_liked_posts).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_response);
        });
    });

    describe('getPosts', () => {
        it('should call user_service.getPosts with the current user id, target user id, and query dto', async () => {
            const mock_response: any = {
                data: [],
            };

            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';
            const query_dto: PaginationParamsDto = {
                page_offset: 0,
                page_size: 10,
            };

            const get_posts = jest
                .spyOn(user_service, 'getPosts')
                .mockResolvedValueOnce(mock_response);

            const result = await controller.getPosts(current_user_id, target_user_id, query_dto);

            expect(get_posts).toHaveBeenCalledWith(current_user_id, target_user_id, query_dto);
            expect(get_posts).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_response);
        });

        it('should throw if service throws', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'nonexistent-id';
            const query_dto: PaginationParamsDto = {
                page_offset: 0,
                page_size: 10,
            };

            const error = new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);

            const get_posts = jest.spyOn(user_service, 'getPosts').mockRejectedValueOnce(error);

            await expect(
                controller.getPosts(current_user_id, target_user_id, query_dto)
            ).rejects.toThrow(ERROR_MESSAGES.USER_NOT_FOUND);

            expect(get_posts).toHaveBeenCalledWith(current_user_id, target_user_id, query_dto);
            expect(get_posts).toHaveBeenCalledTimes(1);
        });
    });

    describe('getReplies', () => {
        it('should call user_service.getReplies with the current user id, target user id, and query dto', async () => {
            const mock_response: any = {
                data: [],
            };

            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';
            const query_dto: PaginationParamsDto = {
                page_offset: 0,
                page_size: 10,
            };

            const get_replies = jest
                .spyOn(user_service, 'getReplies')
                .mockResolvedValueOnce(mock_response);

            const result = await controller.getReplies(current_user_id, target_user_id, query_dto);

            expect(get_replies).toHaveBeenCalledWith(current_user_id, target_user_id, query_dto);
            expect(get_replies).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_response);
        });

        it('should throw if service throws', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'nonexistent-id';
            const query_dto: PaginationParamsDto = {
                page_offset: 0,
                page_size: 10,
            };

            const error = new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);

            const get_replies = jest.spyOn(user_service, 'getReplies').mockRejectedValueOnce(error);

            await expect(
                controller.getReplies(current_user_id, target_user_id, query_dto)
            ).rejects.toThrow(ERROR_MESSAGES.USER_NOT_FOUND);

            expect(get_replies).toHaveBeenCalledWith(current_user_id, target_user_id, query_dto);
            expect(get_replies).toHaveBeenCalledTimes(1);
        });
    });

    describe('getMedia', () => {
        it('should call user_service.getMedia with the current user id, target user id, and query dto', async () => {
            const mock_response: any = {
                data: [],
            };

            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';
            const query_dto: PaginationParamsDto = {
                page_offset: 0,
                page_size: 10,
            };

            const get_media = jest
                .spyOn(user_service, 'getMedia')
                .mockResolvedValueOnce(mock_response);

            const result = await controller.getMedia(current_user_id, target_user_id, query_dto);

            expect(get_media).toHaveBeenCalledWith(current_user_id, target_user_id, query_dto);
            expect(get_media).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_response);
        });

        it('should throw if service throws', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'nonexistent-id';
            const query_dto: PaginationParamsDto = {
                page_offset: 0,
                page_size: 10,
            };

            const error = new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);

            const get_media = jest.spyOn(user_service, 'getMedia').mockRejectedValueOnce(error);

            await expect(
                controller.getMedia(current_user_id, target_user_id, query_dto)
            ).rejects.toThrow(ERROR_MESSAGES.USER_NOT_FOUND);

            expect(get_media).toHaveBeenCalledWith(current_user_id, target_user_id, query_dto);
            expect(get_media).toHaveBeenCalledTimes(1);
        });
    });

    describe('updateUser', () => {
        it('should call user_service.updateUser with the user id and update dto', async () => {
            const mock_response: UserProfileDto = {
                user_id: '809334b7-d429-4d83-8e78-0418731ea97d',
                name: 'Alyaa Ali',
                username: 'alyaa242',
                bio: "Hi there, I'm Alyaa",
                avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                cover_url: 'https://cdn.app.com/profiles/u877.jpg',
                country: null,
                created_at: new Date('2025-10-21T09:26:17.432Z'),
                followers_count: 5,
                following_count: 10,
            };

            const user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const update_user_dto: UpdateUserDto = {
                name: 'Updated Name',
                bio: 'Updated bio',
                avatar_url: 'https://cdn.app.com/profiles/updated.jpg',
            };

            const update_user = jest
                .spyOn(user_service, 'updateUser')
                .mockResolvedValueOnce(mock_response);

            const result = await controller.updateUser(user_id, update_user_dto);

            expect(update_user).toHaveBeenCalledWith(user_id, update_user_dto);
            expect(update_user).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_response);
        });

        it('should throw if service throws', async () => {
            const user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const update_user_dto: UpdateUserDto = {
                name: 'Updated Name',
            };

            const error = new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);

            const update_user = jest.spyOn(user_service, 'updateUser').mockRejectedValueOnce(error);

            await expect(controller.updateUser(user_id, update_user_dto)).rejects.toThrow(
                ERROR_MESSAGES.USER_NOT_FOUND
            );

            expect(update_user).toHaveBeenCalledWith(user_id, update_user_dto);
            expect(update_user).toHaveBeenCalledTimes(1);
        });
    });

    describe('deleteUser', () => {
        it('should call user_service.deleteUser with the current user id', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';

            const delete_user = jest
                .spyOn(user_service, 'deleteUser')
                .mockResolvedValueOnce(undefined);

            const result = await controller.deleteUser(current_user_id);

            expect(delete_user).toHaveBeenCalledWith(current_user_id);
            expect(delete_user).toHaveBeenCalledTimes(1);
            expect(result).toEqual(undefined);
        });

        it('should throw if service throws', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';

            const error = new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);

            const delete_user = jest.spyOn(user_service, 'deleteUser').mockRejectedValueOnce(error);

            await expect(controller.deleteUser(current_user_id)).rejects.toThrow(
                ERROR_MESSAGES.USER_NOT_FOUND
            );

            expect(delete_user).toHaveBeenCalledWith(current_user_id);
            expect(delete_user).toHaveBeenCalledTimes(1);
        });
    });

    describe('changeLanguage', () => {
        it('should call user_service.changeLanguage with the current user id and change language dto', async () => {
            const mock_response: ChangeLanguageResponseDto = {
                language: 'ar',
            };

            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const change_language_dto: ChangeLanguageDto = {
                language: 'ar',
            };

            const change_language = jest
                .spyOn(user_service, 'changeLanguage')
                .mockResolvedValueOnce(mock_response);

            const result = await controller.changeLanguage(current_user_id, change_language_dto);

            expect(change_language).toHaveBeenCalledWith(current_user_id, change_language_dto);
            expect(change_language).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_response);
        });
    });

    describe('uploadAvatar', () => {
        it('should call user_service.uploadAvatar with the current user id and file', async () => {
            const mock_response: UploadFileResponseDto = {
                image_name: 'new-avatar.jpg',
                image_url: 'https://cdn.app.com/profiles/new-avatar.jpg',
            };

            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const file: Express.Multer.File = {
                fieldname: 'file',
                originalname: 'avatar.jpg',
                encoding: '7bit',
                mimetype: 'image/jpeg',
                size: 1024,
                buffer: Buffer.from('fake-image-data'),
                stream: new Readable(),
                destination: '',
                filename: '',
                path: '',
            };

            const upload_avatar = jest
                .spyOn(user_service, 'uploadAvatar')
                .mockResolvedValueOnce(mock_response);

            const result = await controller.uploadAvatar(current_user_id, file);

            expect(upload_avatar).toHaveBeenCalledWith(current_user_id, file);
            expect(upload_avatar).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_response);
        });

        it('should throw if service throws', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const file: Express.Multer.File = {
                fieldname: 'file',
                originalname: 'avatar.txt',
                encoding: '7bit',
                mimetype: 'text/plain',
                size: 1024,
                buffer: Buffer.from('fake-file-data'),
                stream: new Readable(),
                destination: '',
                filename: '',
                path: '',
            };

            const error = new BadRequestException(ERROR_MESSAGES.INVALID_FILE_FORMAT);

            const upload_avatar = jest
                .spyOn(user_service, 'uploadAvatar')
                .mockRejectedValueOnce(error);

            await expect(controller.uploadAvatar(current_user_id, file)).rejects.toThrow(
                ERROR_MESSAGES.INVALID_FILE_FORMAT
            );

            expect(upload_avatar).toHaveBeenCalledWith(current_user_id, file);
            expect(upload_avatar).toHaveBeenCalledTimes(1);
        });
    });

    describe('deleteAvatar', () => {
        it('should call user_service.deleteAvatar with the current user id and delete file dto', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const delete_file_dto: DeleteFileDto = {
                file_url: 'https://cdn.app.com/profiles/old-avatar.jpg',
            };

            const delete_avatar = jest
                .spyOn(user_service, 'deleteAvatar')
                .mockResolvedValueOnce(undefined);

            const result = await controller.deleteAvatar(current_user_id, delete_file_dto);

            expect(delete_avatar).toHaveBeenCalledWith(current_user_id, delete_file_dto);
            expect(delete_avatar).toHaveBeenCalledTimes(1);
            expect(result).toEqual(undefined);
        });

        it('should throw if service throws invalid file url', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const delete_file_dto: DeleteFileDto = {
                file_url: 'invalid.jpg',
            };

            const error = new BadRequestException(ERROR_MESSAGES.INVALID_FILE_URL);

            const delete_avatar = jest
                .spyOn(user_service, 'deleteAvatar')
                .mockRejectedValueOnce(error);

            await expect(controller.deleteAvatar(current_user_id, delete_file_dto)).rejects.toThrow(
                ERROR_MESSAGES.INVALID_FILE_URL
            );

            expect(delete_avatar).toHaveBeenCalledWith(current_user_id, delete_file_dto);
            expect(delete_avatar).toHaveBeenCalledTimes(1);
        });

        it('should throw if service throws file not found', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const delete_file_dto: DeleteFileDto = {
                file_url: 'https://cdn.app.com/profiles/nonexistent.jpg',
            };

            const error = new NotFoundException(ERROR_MESSAGES.FILE_NOT_FOUND);

            const delete_avatar = jest
                .spyOn(user_service, 'deleteAvatar')
                .mockRejectedValueOnce(error);

            await expect(controller.deleteAvatar(current_user_id, delete_file_dto)).rejects.toThrow(
                ERROR_MESSAGES.FILE_NOT_FOUND
            );

            expect(delete_avatar).toHaveBeenCalledWith(current_user_id, delete_file_dto);
            expect(delete_avatar).toHaveBeenCalledTimes(1);
        });
    });

    describe('uploadCover', () => {
        it('should call user_service.uploadCover with the current user id and file', async () => {
            const mock_response: UploadFileResponseDto = {
                image_name: 'new-avatar.jpg',
                image_url: 'https://cdn.app.com/profiles/new-avatar.jpg',
            };

            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const file: Express.Multer.File = {
                fieldname: 'file',
                originalname: 'avatar.jpg',
                encoding: '7bit',
                mimetype: 'image/jpeg',
                size: 1024,
                buffer: Buffer.from('fake-image-data'),
                stream: new Readable(),
                destination: '',
                filename: '',
                path: '',
            };

            const upload_cover = jest
                .spyOn(user_service, 'uploadCover')
                .mockResolvedValueOnce(mock_response);

            const result = await controller.uploadCover(current_user_id, file);

            expect(upload_cover).toHaveBeenCalledWith(current_user_id, file);
            expect(upload_cover).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_response);
        });

        it('should throw if service throws', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const file: Express.Multer.File = {
                fieldname: 'file',
                originalname: 'avatar.txt',
                encoding: '7bit',
                mimetype: 'text/plain',
                size: 1024,
                buffer: Buffer.from('fake-file-data'),
                stream: new Readable(),
                destination: '',
                filename: '',
                path: '',
            };

            const error = new BadRequestException(ERROR_MESSAGES.INVALID_FILE_FORMAT);

            const upload_cover = jest
                .spyOn(user_service, 'uploadCover')
                .mockRejectedValueOnce(error);

            await expect(controller.uploadCover(current_user_id, file)).rejects.toThrow(
                ERROR_MESSAGES.INVALID_FILE_FORMAT
            );

            expect(upload_cover).toHaveBeenCalledWith(current_user_id, file);
            expect(upload_cover).toHaveBeenCalledTimes(1);
        });
    });

    describe('deleteCover', () => {
        it('should call user_service.deleteCover with the current user id and delete file dto', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const delete_file_dto: DeleteFileDto = {
                file_url: 'https://cdn.app.com/profiles/old-avatar.jpg',
            };

            const delete_cover = jest
                .spyOn(user_service, 'deleteCover')
                .mockResolvedValueOnce(undefined);

            const result = await controller.deleteCover(current_user_id, delete_file_dto);

            expect(delete_cover).toHaveBeenCalledWith(current_user_id, delete_file_dto);
            expect(delete_cover).toHaveBeenCalledTimes(1);
            expect(result).toEqual(undefined);
        });

        it('should throw if service throws invalid file url', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const delete_file_dto: DeleteFileDto = {
                file_url: 'invalid.jpg',
            };

            const error = new BadRequestException(ERROR_MESSAGES.INVALID_FILE_URL);

            const delete_cover = jest
                .spyOn(user_service, 'deleteCover')
                .mockRejectedValueOnce(error);

            await expect(controller.deleteCover(current_user_id, delete_file_dto)).rejects.toThrow(
                ERROR_MESSAGES.INVALID_FILE_URL
            );

            expect(delete_cover).toHaveBeenCalledWith(current_user_id, delete_file_dto);
            expect(delete_cover).toHaveBeenCalledTimes(1);
        });

        it('should throw if service throws file not found', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const delete_file_dto: DeleteFileDto = {
                file_url: 'https://cdn.app.com/profiles/nonexistent.jpg',
            };

            const error = new NotFoundException(ERROR_MESSAGES.FILE_NOT_FOUND);

            const delete_cover = jest
                .spyOn(user_service, 'deleteCover')
                .mockRejectedValueOnce(error);

            await expect(controller.deleteCover(current_user_id, delete_file_dto)).rejects.toThrow(
                ERROR_MESSAGES.FILE_NOT_FOUND
            );

            expect(delete_cover).toHaveBeenCalledWith(current_user_id, delete_file_dto);
            expect(delete_cover).toHaveBeenCalledTimes(1);
        });
    });

    describe('assignInterests', () => {
        it('should call user_service.assignInterests with the current user id and assign interests dto', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const assign_interests_dto: AssignInterestsDto = {
                category_ids: [1, 2, 3],
            };

            const assign_interests = jest
                .spyOn(user_service, 'assignInterests')
                .mockResolvedValueOnce(undefined);

            const result = await controller.assignInterests(current_user_id, assign_interests_dto);

            expect(assign_interests).toHaveBeenCalledWith(current_user_id, assign_interests_dto);
            expect(assign_interests).toHaveBeenCalledTimes(1);
            expect(result).toEqual(undefined);
        });

        it('should throw if service throws', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const assign_interests_dto: AssignInterestsDto = {
                category_ids: [88],
            };

            const error = new NotFoundException(ERROR_MESSAGES.CATEGORIES_NOT_FOUND);

            const assign_interests = jest
                .spyOn(user_service, 'assignInterests')
                .mockRejectedValueOnce(error);

            await expect(
                controller.assignInterests(current_user_id, assign_interests_dto)
            ).rejects.toThrow(ERROR_MESSAGES.CATEGORIES_NOT_FOUND);

            expect(assign_interests).toHaveBeenCalledWith(current_user_id, assign_interests_dto);
            expect(assign_interests).toHaveBeenCalledTimes(1);
        });
    });
});
