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

describe('UserController', () => {
    let controller: UserController;
    let user_service: jest.Mocked<UserService>;

    beforeEach(async () => {
        const mock_user_service = {
            getMe: jest.fn(),
            getUserById: jest.fn(),
            getUserByUsername: jest.fn(),
            getFollowers: jest.fn(),
            getFollowing: jest.fn(),
            followUser: jest.fn(),
            unfollowUser: jest.fn(),
            muteUser: jest.fn(),
            unmuteUser: jest.fn(),
            blockUser: jest.fn(),
            unblockUser: jest.fn(),
            getMutedList: jest.fn(),
            getBlockedList: jest.fn(),
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
});
