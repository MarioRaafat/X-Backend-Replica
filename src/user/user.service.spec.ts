import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
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

describe('UserService', () => {
    let service: UserService;
    let user_repository: jest.Mocked<UserRepository>;

    const mock_query_builder = {
        getRawOne: jest.fn(),
        getRawMany: jest.fn(),
    };

    beforeEach(async () => {
        const mock_user_repository = {
            buildProfileQuery: jest.fn().mockReturnValue(mock_query_builder),
            buildUserListQuery: jest.fn(),
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
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [UserService, { provide: UserRepository, useValue: mock_user_repository }],
        }).compile();

        service = module.get<UserService>(UserService);
        user_repository = module.get(UserRepository);
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

            const build_profile_spy = jest
                .spyOn(user_repository, 'buildProfileQuery')
                .mockReturnValue(mock_query_builder as any);

            mock_query_builder.getRawOne.mockResolvedValueOnce(mock_response);

            const result = await service.getMe(user_id);

            expect(build_profile_spy).toHaveBeenCalledWith(user_id, 'id');
            expect(build_profile_spy).toHaveBeenCalledTimes(1);
            expect(mock_query_builder.getRawOne).toHaveBeenCalledTimes(1);
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

            const build_profile_spy = jest
                .spyOn(user_repository, 'buildProfileQuery')
                .mockReturnValue(mock_query_builder as any);

            mock_query_builder.getRawOne.mockResolvedValueOnce(mock_response);

            const result = await service.getUserById(current_user_id, target_user_id);

            expect(build_profile_spy).toHaveBeenCalledWith(target_user_id, 'id', current_user_id);
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

            const build_profile_spy = jest
                .spyOn(user_repository, 'buildProfileQuery')
                .mockReturnValue(mock_query_builder as any);
            mock_query_builder.getRawOne.mockResolvedValueOnce(mock_response);

            const result = await service.getUserById(current_user_id, target_user_id);

            expect(build_profile_spy).toHaveBeenCalledWith(target_user_id, 'id', current_user_id);
            expect(result).toEqual(mock_response);
        });

        it('should throw NotFoundException when user does not exist', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';

            const error = new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);

            const build_profile_spy = jest
                .spyOn(user_repository, 'buildProfileQuery')
                .mockReturnValue(mock_query_builder as any);
            mock_query_builder.getRawOne.mockRejectedValueOnce(error);

            await expect(service.getUserById(current_user_id, target_user_id)).rejects.toThrow(
                ERROR_MESSAGES.USER_NOT_FOUND
            );

            expect(build_profile_spy).toHaveBeenCalledWith(target_user_id, 'id', current_user_id);
            expect(build_profile_spy).toHaveBeenCalledTimes(1);
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

            const build_profile_spy = jest
                .spyOn(user_repository, 'buildProfileQuery')
                .mockReturnValue(mock_query_builder as any);

            mock_query_builder.getRawOne.mockResolvedValueOnce(mock_response);

            const result = await service.getUserByUsername(current_user_id, target_username);

            expect(build_profile_spy).toHaveBeenCalledWith(
                target_username,
                'username',
                current_user_id
            );
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

            const build_profile_spy = jest
                .spyOn(user_repository, 'buildProfileQuery')
                .mockReturnValue(mock_query_builder as any);
            mock_query_builder.getRawOne.mockResolvedValueOnce(mock_response);

            const result = await service.getUserByUsername(current_user_id, target_username);

            expect(build_profile_spy).toHaveBeenCalledWith(
                target_username,
                'username',
                current_user_id
            );
            expect(result).toEqual(mock_response);
        });

        it('should throw NotFoundException when user does not exist', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_username = 'Alyaa242';

            const error = new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);

            const build_profile_spy = jest
                .spyOn(user_repository, 'buildProfileQuery')
                .mockReturnValue(mock_query_builder as any);
            mock_query_builder.getRawOne.mockRejectedValueOnce(error);

            await expect(
                service.getUserByUsername(current_user_id, target_username)
            ).rejects.toThrow(ERROR_MESSAGES.USER_NOT_FOUND);

            expect(build_profile_spy).toHaveBeenCalledWith(
                target_username,
                'username',
                current_user_id
            );
            expect(build_profile_spy).toHaveBeenCalledTimes(1);
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

            const get_followers_spy = jest
                .spyOn(user_repository, 'getFollowersList')
                .mockResolvedValueOnce(mock_followers);

            const result = await service.getFollowers(current_user_id, target_user_id, query_dto);

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

            const get_followers_spy = jest
                .spyOn(user_repository, 'getFollowersList')
                .mockResolvedValueOnce(mock_followers);

            const result = await service.getFollowers(current_user_id, target_user_id, query_dto);

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

            const error = new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);

            const get_followers_spy = jest
                .spyOn(user_repository, 'getFollowersList')
                .mockRejectedValueOnce(error);

            await expect(
                service.getFollowers(current_user_id, target_user_id, query_dto)
            ).rejects.toThrow(ERROR_MESSAGES.USER_NOT_FOUND);

            expect(get_followers_spy).toHaveBeenCalledWith(
                current_user_id,
                target_user_id,
                0,
                10,
                undefined
            );
            expect(get_followers_spy).toHaveBeenCalledTimes(1);
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

            const get_following_spy = jest
                .spyOn(user_repository, 'getFollowingList')
                .mockResolvedValueOnce(mock_following);

            const result = await service.getFollowing(current_user_id, target_user_id, query_dto);

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

            const error = new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);

            const get_following_spy = jest
                .spyOn(user_repository, 'getFollowingList')
                .mockRejectedValueOnce(error);

            await expect(
                service.getFollowing(current_user_id, target_user_id, query_dto)
            ).rejects.toThrow(ERROR_MESSAGES.USER_NOT_FOUND);

            expect(get_following_spy).toHaveBeenCalledWith(current_user_id, target_user_id, 0, 10);
            expect(get_following_spy).toHaveBeenCalledTimes(1);
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
                RelationshipType.FOLLOW,
                'insert'
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
                RelationshipType.FOLLOW,
                'insert'
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
                RelationshipType.FOLLOW,
                'insert'
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
                RelationshipType.FOLLOW,
                'insert'
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
                RelationshipType.FOLLOW,
                'insert'
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

            const validate_spy = jest
                .spyOn(user_repository, 'validateRelationshipRequest')
                .mockResolvedValueOnce({
                    user_exists: true,
                    relationship_exists: true,
                });

            const delete_follow_spy = jest
                .spyOn(user_repository, 'deleteFollowRelationship')
                .mockResolvedValueOnce({} as any);

            await service.unfollowUser(current_user_id, target_user_id);

            expect(validate_spy).toHaveBeenCalledWith(
                current_user_id,
                target_user_id,
                RelationshipType.FOLLOW,
                'remove'
            );
            expect(delete_follow_spy).toHaveBeenCalledWith(current_user_id, target_user_id);
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

            const validate_spy = jest
                .spyOn(user_repository, 'validateRelationshipRequest')
                .mockResolvedValueOnce({
                    user_exists: true,
                    relationship_exists: false,
                });

            const delete_follow_spy = jest
                .spyOn(user_repository, 'deleteFollowRelationship')
                .mockResolvedValueOnce({} as any);

            await expect(service.unfollowUser(current_user_id, target_user_id)).rejects.toThrow(
                new ConflictException(ERROR_MESSAGES.NOT_FOLLOWED)
            );

            expect(delete_follow_spy).not.toHaveBeenCalled();

            expect(validate_spy).toHaveBeenCalledWith(
                current_user_id,
                target_user_id,
                RelationshipType.FOLLOW,
                'remove'
            );
            expect(validate_spy).toHaveBeenCalledTimes(1);
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
                RelationshipType.MUTE,
                'insert'
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
                RelationshipType.MUTE,
                'insert'
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
                RelationshipType.MUTE,
                'insert'
            );
            expect(validate_spy).toHaveBeenCalledTimes(1);
        });
    });

    describe('unmuteUser', () => {
        it('should successfully unmute a user', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';

            const validate_spy = jest
                .spyOn(user_repository, 'validateRelationshipRequest')
                .mockResolvedValueOnce({
                    user_exists: true,
                    relationship_exists: true,
                });

            const delete_mute_spy = jest
                .spyOn(user_repository, 'deleteMuteRelationship')
                .mockResolvedValueOnce({} as any);

            await service.unmuteUser(current_user_id, target_user_id);

            expect(validate_spy).toHaveBeenCalledWith(
                current_user_id,
                target_user_id,
                RelationshipType.MUTE,
                'remove'
            );
            expect(delete_mute_spy).toHaveBeenCalledWith(current_user_id, target_user_id);
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

            const validate_spy = jest
                .spyOn(user_repository, 'validateRelationshipRequest')
                .mockResolvedValueOnce({
                    user_exists: true,
                    relationship_exists: false,
                });

            const delete_mute_spy = jest
                .spyOn(user_repository, 'deleteMuteRelationship')
                .mockResolvedValueOnce({} as any);

            await expect(service.unmuteUser(current_user_id, target_user_id)).rejects.toThrow(
                new ConflictException(ERROR_MESSAGES.NOT_MUTED)
            );

            expect(delete_mute_spy).not.toHaveBeenCalled();

            expect(validate_spy).toHaveBeenCalledWith(
                current_user_id,
                target_user_id,
                RelationshipType.MUTE,
                'remove'
            );
            expect(validate_spy).toHaveBeenCalledTimes(1);
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
                RelationshipType.BLOCK,
                'insert'
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
                RelationshipType.BLOCK,
                'insert'
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
                RelationshipType.BLOCK,
                'insert'
            );
            expect(validate_spy).toHaveBeenCalledTimes(1);
        });
    });

    describe('unblockUser', () => {
        it('should successfully unblock a user', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';

            const validate_spy = jest
                .spyOn(user_repository, 'validateRelationshipRequest')
                .mockResolvedValueOnce({
                    user_exists: true,
                    relationship_exists: true,
                });

            const delete_block_spy = jest
                .spyOn(user_repository, 'deleteBlockRelationship')
                .mockResolvedValueOnce({} as any);

            await service.unblockUser(current_user_id, target_user_id);

            expect(validate_spy).toHaveBeenCalledWith(
                current_user_id,
                target_user_id,
                RelationshipType.BLOCK,
                'remove'
            );
            expect(delete_block_spy).toHaveBeenCalledWith(current_user_id, target_user_id);
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

            const validate_spy = jest
                .spyOn(user_repository, 'validateRelationshipRequest')
                .mockResolvedValueOnce({
                    user_exists: true,
                    relationship_exists: false,
                });

            const delete_block_spy = jest
                .spyOn(user_repository, 'deleteBlockRelationship')
                .mockResolvedValueOnce({} as any);

            await expect(service.unblockUser(current_user_id, target_user_id)).rejects.toThrow(
                new ConflictException(ERROR_MESSAGES.NOT_BLOCKED)
            );

            expect(delete_block_spy).not.toHaveBeenCalled();

            expect(validate_spy).toHaveBeenCalledWith(
                current_user_id,
                target_user_id,
                RelationshipType.BLOCK,
                'remove'
            );
            expect(validate_spy).toHaveBeenCalledTimes(1);
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
