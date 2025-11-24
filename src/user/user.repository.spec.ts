import { DataSource } from 'typeorm';
import { UserRepository } from './user.repository';
import { User, UserBlocks, UserFollows, UserMutes } from './entities';
import { Test, TestingModule } from '@nestjs/testing';
import { UserProfileDto } from './dto/user-profile.dto';
import { DetailedUserProfileDto } from './dto/detailed-user-profile.dto';
import { RelationshipType } from './enums/relationship-type.enum';
import { UserInterests } from './entities/user-interests.entity';
import { PaginationService } from 'src/shared/services/pagination/pagination.service';

describe('UserRepository', () => {
    let repository: UserRepository;
    let data_source: jest.Mocked<DataSource>;
    let entity_manager: any;
    let pagination_service: jest.Mocked<PaginationService>;

    beforeEach(async () => {
        entity_manager = {
            save: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        };

        data_source = {
            createEntityManager: jest.fn().mockReturnValue(entity_manager),
            transaction: jest.fn(),
            getRepository: jest.fn(),
        } as any;

        const mock_pagination_service = {
            applyCursorPagination: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserRepository,
                {
                    provide: DataSource,
                    useValue: data_source,
                },
                { provide: PaginationService, useValue: mock_pagination_service },
            ],
        }).compile();

        repository = module.get<UserRepository>(UserRepository);
        pagination_service = module.get(PaginationService);
    });

    afterEach(() => jest.clearAllMocks());

    describe('findById', () => {
        it('should find user by id', async () => {
            const user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const mock_user = {
                id: user_id,
                name: 'Alyaa Ali',
                username: 'Alyaali242',
                email: 'alyaa@example.com',
            };

            const find_one_spy = jest
                .spyOn(repository, 'findOne')
                .mockResolvedValueOnce(mock_user as User);

            const result = await repository.findById(user_id);

            expect(find_one_spy).toHaveBeenCalledWith({ where: { id: user_id } });
            expect(find_one_spy).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_user);
        });

        it('should return null when user not found', async () => {
            const user_id = 'nonexistent-id';

            const find_one_spy = jest.spyOn(repository, 'findOne').mockResolvedValueOnce(null);

            const result = await repository.findById(user_id);

            expect(find_one_spy).toHaveBeenCalledWith({ where: { id: user_id } });
            expect(result).toBeNull();
        });
    });

    describe('findByEmail', () => {
        it('should find user by email', async () => {
            const email = 'alyaa@example.com';
            const mock_user = {
                id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                name: 'Alyaa Ali',
                username: 'Alyaali242',
                email,
            };

            const find_one_spy = jest
                .spyOn(repository, 'findOne')
                .mockResolvedValueOnce(mock_user as User);

            const result = await repository.findByEmail(email);

            expect(find_one_spy).toHaveBeenCalledWith({ where: { email } });
            expect(find_one_spy).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_user);
        });

        it('should return null when email not found', async () => {
            const email = 'nonexistent@example.com';

            const find_one_spy = jest.spyOn(repository, 'findOne').mockResolvedValueOnce(null);

            const result = await repository.findByEmail(email);

            expect(find_one_spy).toHaveBeenCalledWith({ where: { email } });
            expect(result).toBeNull();
        });
    });

    describe('findByGithubId', () => {
        it('should find user by github_id', async () => {
            const github_id = 'github123';
            const mock_user = {
                id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                github_id,
            };

            const find_one_spy = jest
                .spyOn(repository, 'findOne')
                .mockResolvedValueOnce(mock_user as User);

            const result = await repository.findByGithubId(github_id);

            expect(find_one_spy).toHaveBeenCalledWith({ where: { github_id } });
            expect(result).toEqual(mock_user);
        });
    });

    describe('findByFacebookId', () => {
        it('should find user by facebook_id', async () => {
            const facebook_id = 'facebook123';
            const mock_user = {
                id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                facebook_id,
            };

            const find_one_spy = jest
                .spyOn(repository, 'findOne')
                .mockResolvedValueOnce(mock_user as User);

            const result = await repository.findByFacebookId(facebook_id);

            expect(find_one_spy).toHaveBeenCalledWith({ where: { facebook_id } });
            expect(result).toEqual(mock_user);
        });
    });

    describe('findByGoogleId', () => {
        it('should find user by google_id', async () => {
            const google_id = 'google123';
            const mock_user = {
                id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                google_id,
            };

            const find_one_spy = jest
                .spyOn(repository, 'findOne')
                .mockResolvedValueOnce(mock_user as User);

            const result = await repository.findByGoogleId(google_id);

            expect(find_one_spy).toHaveBeenCalledWith({ where: { google_id } });
            expect(result).toEqual(mock_user);
        });
    });

    describe('findByUsername', () => {
        it('should find user by username', async () => {
            const username = 'Alyaali242';
            const mock_user = {
                id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                username,
            };

            const find_one_spy = jest
                .spyOn(repository, 'findOne')
                .mockResolvedValueOnce(mock_user as User);

            const result = await repository.findByUsername(username);

            expect(find_one_spy).toHaveBeenCalledWith({ where: { username } });
            expect(result).toEqual(mock_user);
        });

        it('should return null when username not found', async () => {
            const username = 'nonexistent';

            const find_one_spy = jest.spyOn(repository, 'findOne').mockResolvedValueOnce(null);

            const result = await repository.findByUsername(username);

            expect(find_one_spy).toHaveBeenCalledWith({ where: { username } });
            expect(result).toBeNull();
        });
    });

    describe('findByPhoneNumber', () => {
        it('should find user by phone_number', async () => {
            const phone_number = '+201234567890';
            const mock_user = {
                id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                phone_number,
            };

            const find_one_spy = jest
                .spyOn(repository, 'findOne')
                .mockResolvedValueOnce(mock_user as User);

            const result = await repository.findByPhoneNumber(phone_number);

            expect(find_one_spy).toHaveBeenCalledWith({ where: { phone_number } });
            expect(result).toEqual(mock_user);
        });
    });

    describe('createUser', () => {
        it('should create and save a new user', async () => {
            const user_data = {
                name: 'Alyaa Ali',
                username: 'Alyaali242',
                email: 'alyaa@example.com',
            };

            const created_user = {
                id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                ...user_data,
            };

            const save_spy = jest
                .spyOn(repository, 'save')
                .mockResolvedValueOnce(created_user as User);

            const result = await repository.createUser(user_data);

            expect(save_spy).toHaveBeenCalledWith(expect.any(User));
            expect(save_spy).toHaveBeenCalledTimes(1);
            expect(result).toEqual(created_user);
        });
    });

    describe('updateUserById', () => {
        it('should update user and return updated user', async () => {
            const user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const update_data = {
                name: 'Updated Name',
                bio: 'Updated bio',
            };

            const updated_user = {
                id: user_id,
                name: 'Updated Name',
                bio: 'Updated bio',
                username: 'Alyaali242',
            };

            const update_spy = jest.spyOn(repository, 'update').mockResolvedValueOnce({} as any);
            const find_by_id_spy = jest
                .spyOn(repository, 'findById')
                .mockResolvedValueOnce(updated_user as User);

            const result = await repository.updateUserById(user_id, update_data);

            expect(update_spy).toHaveBeenCalledWith(user_id, update_data);
            expect(update_spy).toHaveBeenCalledTimes(1);
            expect(find_by_id_spy).toHaveBeenCalledWith(user_id);
            expect(find_by_id_spy).toHaveBeenCalledTimes(1);
            expect(result).toEqual(updated_user);
        });

        it('should return null when user not found after update', async () => {
            const user_id = 'nonexistent-id';
            const update_data = { name: 'Updated Name' };

            const update_spy = jest.spyOn(repository, 'update').mockResolvedValueOnce({} as any);
            const find_by_id_spy = jest.spyOn(repository, 'findById').mockResolvedValueOnce(null);

            const result = await repository.updateUserById(user_id, update_data);

            expect(update_spy).toHaveBeenCalledWith(user_id, update_data);
            expect(find_by_id_spy).toHaveBeenCalledWith(user_id);
            expect(result).toBeNull();
        });
    });

    describe('updatePassword', () => {
        it('should update user password and return updated user', async () => {
            const user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const new_password = 'newHashedPassword123';

            const updated_user = {
                id: user_id,
                password: new_password,
            };

            const update_spy = jest.spyOn(repository, 'update').mockResolvedValueOnce({} as any);
            const find_by_id_spy = jest
                .spyOn(repository, 'findById')
                .mockResolvedValueOnce(updated_user as User);

            const result = await repository.updatePassword(user_id, new_password);

            expect(update_spy).toHaveBeenCalledWith(user_id, { password: new_password });
            expect(update_spy).toHaveBeenCalledTimes(1);
            expect(find_by_id_spy).toHaveBeenCalledWith(user_id);
            expect(find_by_id_spy).toHaveBeenCalledTimes(1);
            expect(result).toEqual(updated_user);
        });

        it('should return null when user not found after update', async () => {
            const user_id = 'nonexistent-id';
            const new_password = 'newHashedPassword123';

            const updated_user = {
                id: user_id,
                password: new_password,
            };
            const update_spy = jest.spyOn(repository, 'update').mockResolvedValueOnce({} as any);
            const find_by_id_spy = jest.spyOn(repository, 'findById').mockResolvedValueOnce(null);

            const result = await repository.updateUserById(user_id, updated_user);

            expect(update_spy).toHaveBeenCalledWith(user_id, updated_user);
            expect(find_by_id_spy).toHaveBeenCalledWith(user_id);
            expect(result).toBeNull();
        });
    });

    describe('getMyProfile', () => {
        it('should return user profile', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const mock_profile: UserProfileDto = {
                user_id: current_user_id,
                name: 'Alyaa Ali',
                username: 'Alyaali242',
                bio: 'hi there!',
                avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                cover_url: 'https://cdn.app.com/profiles/cover877.jpg',
                followers_count: 5,
                following_count: 15,
                country: 'Egypt',
                created_at: new Date('2025-10-30'),
                birth_date: new Date('2025-10-30'),
            };

            const mock_query_builder = {
                getRawOne: jest.fn().mockResolvedValueOnce(mock_profile),
            };

            const build_profile_query_spy = jest
                .spyOn(repository, 'buildProfileQuery')
                .mockReturnValue(mock_query_builder as any);

            const result = await repository.getMyProfile(current_user_id);

            expect(build_profile_query_spy).toHaveBeenCalledWith(current_user_id, 'id');
            expect(build_profile_query_spy).toHaveBeenCalledTimes(1);
            expect(mock_query_builder.getRawOne).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_profile);
        });

        it('should return null when profile not found', async () => {
            const current_user_id = 'nonexistent-id';

            const mock_query_builder = {
                getRawOne: jest.fn().mockResolvedValueOnce(undefined),
            };

            const build_profile_query_spy = jest
                .spyOn(repository, 'buildProfileQuery')
                .mockReturnValue(mock_query_builder as any);

            const result = await repository.getMyProfile(current_user_id);

            expect(build_profile_query_spy).toHaveBeenCalledWith(current_user_id, 'id');
            expect(result).toBeNull();
        });
    });

    describe('getProfileById', () => {
        it('should return detailed profile with viewer context when current_user_id is provided', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';
            const mock_profile: DetailedUserProfileDto = {
                user_id: target_user_id,
                name: 'Alyaa Ali',
                username: 'Alyaali242',
                bio: 'hi there!',
                avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                cover_url: 'https://cdn.app.com/profiles/cover877.jpg',
                followers_count: 5,
                following_count: 15,
                country: 'Egypt',
                created_at: new Date('2025-10-30'),
                birth_date: new Date('2025-10-30'),
                is_follower: true,
                is_following: false,
                is_muted: false,
                is_blocked: false,
                top_mutual_followers: [],
                mutual_followers_count: 5,
            };

            const mock_query_builder_with_context = {
                getRawOne: jest.fn().mockResolvedValueOnce(mock_profile),
            };

            const mock_base_query = {} as any;

            const build_profile_query_spy = jest
                .spyOn(repository, 'buildProfileQuery')
                .mockReturnValue(mock_base_query);

            const add_viewer_context_spy = jest
                .spyOn(repository, 'addViewerContextToProfileQuery')
                .mockReturnValue(mock_query_builder_with_context as any);

            const result = await repository.getProfileById(current_user_id, target_user_id);

            expect(build_profile_query_spy).toHaveBeenCalledWith(target_user_id, 'id');
            expect(add_viewer_context_spy).toHaveBeenCalledWith(mock_base_query, current_user_id);
            expect(mock_query_builder_with_context.getRawOne).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_profile);
        });

        it('should return basic profile without viewer context when current_user_id is null', async () => {
            const current_user_id = null;
            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';
            const mock_profile: UserProfileDto = {
                user_id: target_user_id,
                name: 'Alyaa Ali',
                username: 'Alyaali242',
                bio: 'hi there!',
                avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                cover_url: 'https://cdn.app.com/profiles/cover877.jpg',
                followers_count: 5,
                following_count: 15,
                country: 'Egypt',
                created_at: new Date('2025-10-30'),
                birth_date: new Date('2025-10-30'),
            };

            const mock_query_builder = {
                getRawOne: jest.fn().mockResolvedValueOnce(mock_profile),
            };

            const build_profile_query_spy = jest
                .spyOn(repository, 'buildProfileQuery')
                .mockReturnValue(mock_query_builder as any);

            const result = await repository.getProfileById(current_user_id, target_user_id);

            expect(build_profile_query_spy).toHaveBeenCalledWith(target_user_id, 'id');
            expect(mock_query_builder.getRawOne).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_profile);
        });

        it('should return null when profile not found', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'nonexistent-id';

            const mock_query_builder_with_context = {
                getRawOne: jest.fn().mockResolvedValueOnce(undefined),
            };

            const mock_base_query = {} as any;

            jest.spyOn(repository, 'buildProfileQuery').mockReturnValue(mock_base_query);
            jest.spyOn(repository, 'addViewerContextToProfileQuery').mockReturnValue(
                mock_query_builder_with_context as any
            );

            const result = await repository.getProfileById(current_user_id, target_user_id);

            expect(result).toBeNull();
        });
    });

    describe('getProfileByUsername', () => {
        it('should return detailed profile with viewer context when current_user_id is provided', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_username = 'Alyaali242';
            const mock_profile: DetailedUserProfileDto = {
                user_id: 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90',
                name: 'Alyaa Ali',
                username: target_username,
                bio: 'hi there!',
                avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                cover_url: 'https://cdn.app.com/profiles/cover877.jpg',
                followers_count: 5,
                following_count: 15,
                country: 'Egypt',
                created_at: new Date('2025-10-30'),
                birth_date: new Date('2025-10-30'),
                is_follower: true,
                is_following: false,
                is_muted: false,
                is_blocked: false,
                top_mutual_followers: [],
                mutual_followers_count: 5,
            };

            const mock_query_builder_with_context = {
                getRawOne: jest.fn().mockResolvedValueOnce(mock_profile),
            };

            const mock_base_query = {} as any;

            const build_profile_query_spy = jest
                .spyOn(repository, 'buildProfileQuery')
                .mockReturnValue(mock_base_query);

            const add_viewer_context_spy = jest
                .spyOn(repository, 'addViewerContextToProfileQuery')
                .mockReturnValue(mock_query_builder_with_context as any);

            const result = await repository.getProfileByUsername(current_user_id, target_username);

            expect(build_profile_query_spy).toHaveBeenCalledWith(target_username, 'username');
            expect(add_viewer_context_spy).toHaveBeenCalledWith(mock_base_query, current_user_id);
            expect(mock_query_builder_with_context.getRawOne).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_profile);
        });

        it('should return basic profile without viewer context when current_user_id is null', async () => {
            const current_user_id = null;
            const target_username = 'Alyaali242';
            const mock_profile: UserProfileDto = {
                user_id: 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90',
                name: 'Alyaa Ali',
                username: target_username,
                bio: 'hi there!',
                avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                cover_url: 'https://cdn.app.com/profiles/cover877.jpg',
                followers_count: 5,
                following_count: 15,
                country: 'Egypt',
                created_at: new Date('2025-10-30'),
                birth_date: new Date('2025-10-30'),
            };

            const mock_query_builder = {
                getRawOne: jest.fn().mockResolvedValueOnce(mock_profile),
            };

            const build_profile_query_spy = jest
                .spyOn(repository, 'buildProfileQuery')
                .mockReturnValue(mock_query_builder as any);

            const result = await repository.getProfileByUsername(current_user_id, target_username);

            expect(build_profile_query_spy).toHaveBeenCalledWith(target_username, 'username');
            expect(mock_query_builder.getRawOne).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_profile);
        });

        it('should return null when profile not found', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_username = 'nonexistent-username';

            const mock_query_builder_with_context = {
                getRawOne: jest.fn().mockResolvedValueOnce(undefined),
            };

            const mock_base_query = {} as any;

            jest.spyOn(repository, 'buildProfileQuery').mockReturnValue(mock_base_query);
            jest.spyOn(repository, 'addViewerContextToProfileQuery').mockReturnValue(
                mock_query_builder_with_context as any
            );

            const result = await repository.getProfileByUsername(current_user_id, target_username);

            expect(result).toBeNull();
        });
    });

    describe('buildProfileQuery', () => {
        it('should build query with id identifier', () => {
            const identifier = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const identifier_type = 'id';

            const mock_query_builder = {
                select: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                groupBy: jest.fn().mockReturnThis(),
                addGroupBy: jest.fn().mockReturnThis(),
            };

            const create_query_builder_spy = jest
                .spyOn(repository, 'createQueryBuilder')
                .mockReturnValue(mock_query_builder as any);

            const result = repository.buildProfileQuery(identifier, identifier_type);

            expect(create_query_builder_spy).toHaveBeenCalledWith('user');
            expect(mock_query_builder.where).toHaveBeenCalledWith('user.id = :identifier', {
                identifier,
            });
            expect(result).toBe(mock_query_builder);
        });

        it('should build query with username identifier', () => {
            const identifier = 'Alyaali242';
            const identifier_type = 'username';

            const mock_query_builder = {
                select: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                groupBy: jest.fn().mockReturnThis(),
                addGroupBy: jest.fn().mockReturnThis(),
            };

            const create_query_builder_spy = jest
                .spyOn(repository, 'createQueryBuilder')
                .mockReturnValue(mock_query_builder as any);

            const result = repository.buildProfileQuery(identifier, identifier_type);

            expect(create_query_builder_spy).toHaveBeenCalledWith('user');
            expect(mock_query_builder.where).toHaveBeenCalledWith('user.username = :identifier', {
                identifier,
            });
            expect(result).toBe(mock_query_builder);
        });
    });

    describe('addViewerContextToProfileQuery', () => {
        it('should add viewer context selects to query', () => {
            const viewer_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';

            const mock_query_builder = {
                addSelect: jest.fn().mockReturnThis(),
                setParameter: jest.fn().mockReturnThis(),
            };

            const result = repository.addViewerContextToProfileQuery(
                mock_query_builder as any,
                viewer_id
            );

            expect(mock_query_builder.addSelect).toHaveBeenCalledTimes(6);
            expect(mock_query_builder.setParameter).toHaveBeenCalledWith('viewer_id', viewer_id);
            expect(result).toBe(mock_query_builder);
        });
    });

    describe('buildUserListQuery', () => {
        it('should build user list query with relationship context', () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';

            const mock_query_builder = {
                select: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                setParameter: jest.fn().mockReturnThis(),
            };

            const create_query_builder_spy = jest
                .spyOn(repository, 'createQueryBuilder')
                .mockReturnValue(mock_query_builder as any);

            const result = repository.buildUserListQuery(current_user_id);

            expect(create_query_builder_spy).toHaveBeenCalledWith('user');
            expect(mock_query_builder.addSelect).toHaveBeenCalledTimes(4);
            expect(mock_query_builder.setParameter).toHaveBeenCalledWith(
                'current_user_id',
                current_user_id
            );
            expect(result).toBe(mock_query_builder);
        });
    });

    describe('getUsersByIds', () => {
        it('should get users by ids with relationship context when current_user_id is provided', async () => {
            const user_ids = [
                '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                'b2d59899-f706-4c8f-97d7-ba2e9fc22d90',
            ];
            const current_user_id = '1a2b3c4d-5e6f-7g8h-9i0j-k1l2m3n4o5p6';

            const mock_users = [
                {
                    user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                    name: 'Alyaa Ali',
                    username: 'Alyaali242',
                    bio: 'hi there!',
                    avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                    is_following: false,
                    is_follower: true,
                    is_muted: false,
                    is_blocked: false,
                },
                {
                    user_id: 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90',
                    name: 'Mario Raafat',
                    username: 'MarioR123',
                    bio: 'hello!',
                    avatar_url: 'https://cdn.app.com/profiles/u123.jpg',
                    is_following: true,
                    is_follower: false,
                    is_muted: false,
                    is_blocked: false,
                },
            ];

            const mock_query_builder = {
                where: jest.fn().mockReturnThis(),
                getRawMany: jest.fn().mockResolvedValueOnce(mock_users),
            };

            const build_user_list_query_spy = jest
                .spyOn(repository, 'buildUserListQuery')
                .mockReturnValue(mock_query_builder as any);

            const result = await repository.getUsersByIds(user_ids, current_user_id);

            expect(build_user_list_query_spy).toHaveBeenCalledWith(current_user_id);
            expect(build_user_list_query_spy).toHaveBeenCalledTimes(1);
            expect(mock_query_builder.where).toHaveBeenCalledWith('"user"."id" IN (:...user_ids)', {
                user_ids,
            });
            expect(mock_query_builder.getRawMany).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_users);
        });

        it('should get users by ids without relationship context when current_user_id is null', async () => {
            const user_ids = ['0c059899-f706-4c8f-97d7-ba2e9fc22d6d'];
            const current_user_id = null;

            const mock_users = [
                {
                    user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                    name: 'Alyaa Ali',
                    username: 'Alyaali242',
                    bio: 'hi there!',
                    avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                },
            ];

            const mock_query_builder = {
                select: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getRawMany: jest.fn().mockResolvedValueOnce(mock_users),
            };

            const create_query_builder_spy = jest
                .spyOn(repository, 'createQueryBuilder')
                .mockReturnValue(mock_query_builder as any);

            const result = await repository.getUsersByIds(user_ids, current_user_id);

            expect(create_query_builder_spy).toHaveBeenCalledWith('user');
            expect(mock_query_builder.where).toHaveBeenCalledWith('"user"."id" IN (:...user_ids)', {
                user_ids,
            });
            expect(result).toEqual(mock_users);
        });

        it('should return empty array when no users found', async () => {
            const user_ids = ['nonexistent-id'];
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';

            const mock_query_builder = {
                where: jest.fn().mockReturnThis(),
                getRawMany: jest.fn().mockResolvedValueOnce([]),
            };

            jest.spyOn(repository, 'buildUserListQuery').mockReturnValue(mock_query_builder as any);

            const result = await repository.getUsersByIds(user_ids, current_user_id);

            expect(result).toEqual([]);
        });
    });

    describe('getUsersByUsernames', () => {
        it('should get users by usernames with relationship context when current_user_id is provided', async () => {
            const usernames = ['Alyaali242', 'MarioR123'];
            const current_user_id = '1a2b3c4d-5e6f-7g8h-9i0j-k1l2m3n4o5p6';

            const mock_users = [
                {
                    user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                    name: 'Alyaa Ali',
                    username: 'Alyaali242',
                    bio: 'hi there!',
                    avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                    is_following: false,
                    is_follower: true,
                    is_muted: false,
                    is_blocked: false,
                },
                {
                    user_id: 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90',
                    name: 'Mario Raafat',
                    username: 'MarioR123',
                    bio: 'hello!',
                    avatar_url: 'https://cdn.app.com/profiles/u123.jpg',
                    is_following: true,
                    is_follower: false,
                    is_muted: false,
                    is_blocked: false,
                },
            ];

            const mock_query_builder = {
                where: jest.fn().mockReturnThis(),
                getRawMany: jest.fn().mockResolvedValueOnce(mock_users),
            };

            const build_user_list_query_spy = jest
                .spyOn(repository, 'buildUserListQuery')
                .mockReturnValue(mock_query_builder as any);

            const result = await repository.getUsersByUsernames(usernames, current_user_id);

            expect(build_user_list_query_spy).toHaveBeenCalledWith(current_user_id);
            expect(build_user_list_query_spy).toHaveBeenCalledTimes(1);
            expect(mock_query_builder.where).toHaveBeenCalledWith(
                '"user"."username" IN (:...usernames)',
                { usernames }
            );
            expect(mock_query_builder.getRawMany).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_users);
        });

        it('should get users by usernames without relationship context when current_user_id is null', async () => {
            const usernames = ['Alyaali242'];
            const current_user_id = null;

            const mock_users = [
                {
                    user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d',
                    name: 'Alyaa Ali',
                    username: 'Alyaali242',
                    bio: 'hi there!',
                    avatar_url: 'https://cdn.app.com/profiles/u877.jpg',
                },
            ];

            const mock_query_builder = {
                select: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getRawMany: jest.fn().mockResolvedValueOnce(mock_users),
            };

            const create_query_builder_spy = jest
                .spyOn(repository, 'createQueryBuilder')
                .mockReturnValue(mock_query_builder as any);

            const result = await repository.getUsersByUsernames(usernames, current_user_id);

            expect(create_query_builder_spy).toHaveBeenCalledWith('user');
            expect(mock_query_builder.where).toHaveBeenCalledWith(
                '"user"."username" IN (:...usernames)',
                { usernames }
            );
            expect(result).toEqual(mock_users);
        });
    });

    describe('getFollowersList', () => {
        it('should get followers list without following filter', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';
            const cursor = '2025-10-31T12:00:00.000Z_550e8400-e29b-41d4-a716-446655440000';
            const limit = 20;

            const mock_followers = [
                {
                    user_id: '1a2b3c4d-5e6f-7g8h-9i0j-k1l2m3n4o5p6',
                    name: 'Follower One',
                    username: 'follower1',
                    bio: 'bio',
                    avatar_url: 'https://cdn.app.com/profiles/f1.jpg',
                    is_following: false,
                    is_follower: true,
                    is_muted: false,
                    is_blocked: false,
                },
            ];

            const mock_query_builder = {
                addSelect: jest.fn().mockReturnThis(),
                innerJoin: jest.fn().mockReturnThis(),
                setParameter: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                addOrderBy: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                getRawMany: jest.fn().mockResolvedValueOnce(mock_followers),
            };

            const build_user_list_query_spy = jest
                .spyOn(repository, 'buildUserListQuery')
                .mockReturnValue(mock_query_builder as any);

            const apply_cursor_pagination_spy = jest
                .spyOn(pagination_service, 'applyCursorPagination')
                .mockReturnValue(mock_query_builder as any);

            const result = await repository.getFollowersList(
                current_user_id,
                target_user_id,
                cursor,
                limit
            );

            expect(build_user_list_query_spy).toHaveBeenCalledWith(current_user_id);
            expect(mock_query_builder.addSelect).toHaveBeenCalledWith(
                'target_followers.created_at',
                'created_at'
            );
            expect(mock_query_builder.innerJoin).toHaveBeenCalledWith(
                'user_follows',
                'target_followers',
                'target_followers.follower_id = "user"."id" AND target_followers.followed_id = :target_user_id'
            );
            expect(mock_query_builder.setParameter).toHaveBeenCalledWith(
                'target_user_id',
                target_user_id
            );
            expect(mock_query_builder.orderBy).toHaveBeenCalledWith(
                'target_followers.created_at',
                'DESC'
            );
            expect(mock_query_builder.addOrderBy).toHaveBeenCalledWith(
                'target_followers.follower_id',
                'DESC'
            );
            expect(mock_query_builder.limit).toHaveBeenCalledWith(limit);
            expect(apply_cursor_pagination_spy).toHaveBeenCalledWith(
                mock_query_builder,
                cursor,
                'target_followers',
                'created_at',
                'follower_id'
            );
            expect(mock_query_builder.getRawMany).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_followers);
        });

        it('should get followers list filtered by following when following is true', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';
            const cursor = '2025-10-31T12:00:00.000Z_550e8400-e29b-41d4-a716-446655440000';
            const limit = 20;
            const following = true;

            const mock_followers = [
                {
                    user_id: '1a2b3c4d-5e6f-7g8h-9i0j-k1l2m3n4o5p6',
                    name: 'Mutual Follower',
                    username: 'mutualfollower',
                    bio: 'bio',
                    avatar_url: 'https://cdn.app.com/profiles/mf.jpg',
                    is_following: true,
                    is_follower: true,
                    is_muted: false,
                    is_blocked: false,
                },
            ];

            const mock_query_builder = {
                addSelect: jest.fn().mockReturnThis(),
                innerJoin: jest.fn().mockReturnThis(),
                setParameter: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                addOrderBy: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                getRawMany: jest.fn().mockResolvedValueOnce(mock_followers),
            };

            const build_user_list_query_spy = jest
                .spyOn(repository, 'buildUserListQuery')
                .mockReturnValue(mock_query_builder as any);

            const apply_cursor_pagination_spy = jest
                .spyOn(pagination_service, 'applyCursorPagination')
                .mockReturnValue(mock_query_builder as any);

            const result = await repository.getFollowersList(
                current_user_id,
                target_user_id,
                cursor,
                limit,
                following
            );

            expect(mock_query_builder.innerJoin).toHaveBeenCalledWith(
                'user_follows',
                'current_user_following',
                'current_user_following.follower_id = :current_user_id AND current_user_following.followed_id = "user"."id"'
            );
            expect(build_user_list_query_spy).toHaveBeenCalledWith(current_user_id);
            expect(mock_query_builder.addSelect).toHaveBeenCalledWith(
                'target_followers.created_at',
                'created_at'
            );
            expect(mock_query_builder.innerJoin).toHaveBeenCalledWith(
                'user_follows',
                'target_followers',
                'target_followers.follower_id = "user"."id" AND target_followers.followed_id = :target_user_id'
            );
            expect(mock_query_builder.setParameter).toHaveBeenCalledWith(
                'target_user_id',
                target_user_id
            );
            expect(mock_query_builder.orderBy).toHaveBeenCalledWith(
                'target_followers.created_at',
                'DESC'
            );
            expect(mock_query_builder.addOrderBy).toHaveBeenCalledWith(
                'target_followers.follower_id',
                'DESC'
            );
            expect(mock_query_builder.limit).toHaveBeenCalledWith(limit);
            expect(apply_cursor_pagination_spy).toHaveBeenCalledWith(
                mock_query_builder,
                cursor,
                'target_followers',
                'created_at',
                'follower_id'
            );
            expect(mock_query_builder.getRawMany).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_followers);
        });
    });

    describe('getFollowingList', () => {
        it('should get following list', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';
            const cursor = '2025-10-31T12:00:00.000Z_550e8400-e29b-41d4-a716-446655440000';
            const limit = 20;

            const mock_following = [
                {
                    user_id: '1a2b3c4d-5e6f-7g8h-9i0j-k1l2m3n4o5p6',
                    name: 'Following User',
                    username: 'followinguser',
                    bio: 'bio',
                    avatar_url: 'https://cdn.app.com/profiles/fu.jpg',
                    is_following: true,
                    is_follower: false,
                    is_muted: false,
                    is_blocked: false,
                },
            ];

            const mock_query_builder = {
                addSelect: jest.fn().mockReturnThis(),
                innerJoin: jest.fn().mockReturnThis(),
                setParameter: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                addOrderBy: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                getRawMany: jest.fn().mockResolvedValueOnce(mock_following),
            };

            const build_user_list_query_spy = jest
                .spyOn(repository, 'buildUserListQuery')
                .mockReturnValue(mock_query_builder as any);

            const apply_cursor_pagination_spy = jest
                .spyOn(pagination_service, 'applyCursorPagination')
                .mockReturnValue(mock_query_builder as any);

            const result = await repository.getFollowingList(
                current_user_id,
                target_user_id,
                cursor,
                limit
            );

            expect(build_user_list_query_spy).toHaveBeenCalledWith(current_user_id);
            expect(mock_query_builder.addSelect).toHaveBeenCalledWith(
                'target_following.created_at',
                'created_at'
            );
            expect(mock_query_builder.innerJoin).toHaveBeenCalledWith(
                'user_follows',
                'target_following',
                'target_following.follower_id = :target_user_id AND target_following.followed_id = "user"."id"'
            );
            expect(mock_query_builder.setParameter).toHaveBeenCalledWith(
                'target_user_id',
                target_user_id
            );
            expect(mock_query_builder.orderBy).toHaveBeenCalledWith(
                'target_following.created_at',
                'DESC'
            );
            expect(mock_query_builder.addOrderBy).toHaveBeenCalledWith(
                'target_following.followed_id',
                'DESC'
            );
            expect(mock_query_builder.limit).toHaveBeenCalledWith(limit);
            expect(apply_cursor_pagination_spy).toHaveBeenCalledWith(
                mock_query_builder,
                cursor,
                'target_following',
                'created_at',
                'followed_id'
            );
            expect(mock_query_builder.getRawMany).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_following);
        });
    });

    describe('getMutedUsersList', () => {
        it('should get muted users list', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const cursor = '2025-10-31T12:00:00.000Z_550e8400-e29b-41d4-a716-446655440000';
            const limit = 20;

            const mock_muted_users = [
                {
                    user_id: '1a2b3c4d-5e6f-7g8h-9i0j-k1l2m3n4o5p6',
                    name: 'Muted User',
                    username: 'muteduser',
                    bio: 'bio',
                    avatar_url: 'https://cdn.app.com/profiles/mu.jpg',
                    is_following: false,
                    is_follower: false,
                    is_muted: true,
                    is_blocked: false,
                },
            ];

            const mock_query_builder = {
                addSelect: jest.fn().mockReturnThis(),
                innerJoin: jest.fn().mockReturnThis(),
                setParameter: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                addOrderBy: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                getRawMany: jest.fn().mockResolvedValueOnce(mock_muted_users),
            };

            const build_user_list_query_spy = jest
                .spyOn(repository, 'buildUserListQuery')
                .mockReturnValue(mock_query_builder as any);

            const apply_cursor_pagination_spy = jest
                .spyOn(pagination_service, 'applyCursorPagination')
                .mockReturnValue(mock_query_builder as any);

            const result = await repository.getMutedUsersList(current_user_id, cursor, limit);

            expect(build_user_list_query_spy).toHaveBeenCalledWith(current_user_id);
            expect(mock_query_builder.addSelect).toHaveBeenCalledWith(
                'target_muted.created_at',
                'created_at'
            );
            expect(mock_query_builder.innerJoin).toHaveBeenCalledWith(
                'user_mutes',
                'target_muted',
                'target_muted.muter_id = :current_user_id AND target_muted.muted_id = "user"."id"'
            );
            expect(mock_query_builder.setParameter).toHaveBeenCalledWith(
                'current_user_id',
                current_user_id
            );
            expect(mock_query_builder.orderBy).toHaveBeenCalledWith(
                'target_muted.created_at',
                'DESC'
            );
            expect(mock_query_builder.addOrderBy).toHaveBeenCalledWith(
                'target_muted.muted_id',
                'DESC'
            );
            expect(mock_query_builder.limit).toHaveBeenCalledWith(limit);
            expect(apply_cursor_pagination_spy).toHaveBeenCalledWith(
                mock_query_builder,
                cursor,
                'target_muted',
                'created_at',
                'muted_id'
            );
            expect(mock_query_builder.getRawMany).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_muted_users);
        });
    });

    describe('getBlockedUsersList', () => {
        it('should get blocked users list', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const cursor = '2025-10-31T12:00:00.000Z_550e8400-e29b-41d4-a716-446655440000';
            const limit = 20;

            const mock_blocked_users = [
                {
                    user_id: '1a2b3c4d-5e6f-7g8h-9i0j-k1l2m3n4o5p6',
                    name: 'Blocked User',
                    username: 'blockeduser',
                    bio: 'bio',
                    avatar_url: 'https://cdn.app.com/profiles/bu.jpg',
                    is_following: false,
                    is_follower: false,
                    is_muted: false,
                    is_blocked: true,
                },
            ];

            const mock_query_builder = {
                addSelect: jest.fn().mockReturnThis(),
                innerJoin: jest.fn().mockReturnThis(),
                setParameter: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                addOrderBy: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                getRawMany: jest.fn().mockResolvedValueOnce(mock_blocked_users),
            };

            const build_user_list_query_spy = jest
                .spyOn(repository, 'buildUserListQuery')
                .mockReturnValue(mock_query_builder as any);

            const apply_cursor_pagination_spy = jest
                .spyOn(pagination_service, 'applyCursorPagination')
                .mockReturnValue(mock_query_builder as any);

            const result = await repository.getBlockedUsersList(current_user_id, cursor, limit);

            expect(build_user_list_query_spy).toHaveBeenCalledWith(current_user_id);
            expect(mock_query_builder.addSelect).toHaveBeenCalledWith(
                'target_blocked.created_at',
                'created_at'
            );
            expect(mock_query_builder.innerJoin).toHaveBeenCalledWith(
                'user_blocks',
                'target_blocked',
                'target_blocked.blocker_id = :current_user_id AND target_blocked.blocked_id = "user"."id"'
            );
            expect(mock_query_builder.setParameter).toHaveBeenCalledWith(
                'current_user_id',
                current_user_id
            );
            expect(mock_query_builder.orderBy).toHaveBeenCalledWith(
                'target_blocked.created_at',
                'DESC'
            );
            expect(mock_query_builder.addOrderBy).toHaveBeenCalledWith(
                'target_blocked.blocked_id',
                'DESC'
            );
            expect(mock_query_builder.limit).toHaveBeenCalledWith(limit);
            expect(apply_cursor_pagination_spy).toHaveBeenCalledWith(
                mock_query_builder,
                cursor,
                'target_blocked',
                'created_at',
                'blocked_id'
            );
            expect(mock_query_builder.getRawMany).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_blocked_users);
        });
    });

    describe('insertFollowRelationship', () => {
        it('should insert follow relationship and increment counters', async () => {
            const follower_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const followed_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';

            const mock_insert_result = {
                identifiers: [],
                generatedMaps: [],
                raw: [],
            };

            const mock_manager = {
                insert: jest.fn().mockResolvedValueOnce(mock_insert_result),
                increment: jest.fn().mockResolvedValue(undefined),
            };

            const transaction_spy = jest
                .spyOn(data_source, 'transaction')
                .mockImplementation(async (callback: any) => {
                    return await callback(mock_manager);
                });

            const result = await repository.insertFollowRelationship(follower_id, followed_id);

            expect(transaction_spy).toHaveBeenCalledTimes(1);
            expect(mock_manager.insert).toHaveBeenCalledWith(
                UserFollows,
                expect.objectContaining({ follower_id, followed_id })
            );
            expect(mock_manager.increment).toHaveBeenCalledWith(
                User,
                { id: follower_id },
                'following',
                1
            );
            expect(mock_manager.increment).toHaveBeenCalledWith(
                User,
                { id: followed_id },
                'followers',
                1
            );
            expect(mock_manager.increment).toHaveBeenCalledTimes(2);
            expect(result).toEqual(mock_insert_result);
        });
    });

    describe('deleteFollowRelationship', () => {
        it('should delete follow relationship and decrement counters when relationship exists', async () => {
            const follower_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const followed_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';

            const mock_delete_result = {
                affected: 1,
                raw: [],
            };

            const mock_manager = {
                delete: jest.fn().mockResolvedValueOnce(mock_delete_result),
                decrement: jest.fn().mockResolvedValue(undefined),
            };

            const transaction_spy = jest
                .spyOn(data_source, 'transaction')
                .mockImplementation(async (callback: any) => {
                    return await callback(mock_manager);
                });

            const result = await repository.deleteFollowRelationship(follower_id, followed_id);

            expect(transaction_spy).toHaveBeenCalledTimes(1);
            expect(mock_manager.delete).toHaveBeenCalledWith(UserFollows, {
                follower_id,
                followed_id,
            });
            expect(mock_manager.decrement).toHaveBeenCalledWith(
                User,
                { id: follower_id },
                'following',
                1
            );
            expect(mock_manager.decrement).toHaveBeenCalledWith(
                User,
                { id: followed_id },
                'followers',
                1
            );
            expect(mock_manager.decrement).toHaveBeenCalledTimes(2);
            expect(result).toEqual(mock_delete_result);
        });

        it('should not decrement counters when relationship does not exist', async () => {
            const follower_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const followed_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';

            const mock_delete_result = {
                affected: 0,
                raw: [],
            };

            const mock_manager = {
                delete: jest.fn().mockResolvedValueOnce(mock_delete_result),
                decrement: jest.fn().mockResolvedValue(undefined),
            };

            const transaction_spy = jest
                .spyOn(data_source, 'transaction')
                .mockImplementation(async (callback: any) => {
                    return await callback(mock_manager);
                });

            const result = await repository.deleteFollowRelationship(follower_id, followed_id);

            expect(transaction_spy).toHaveBeenCalledTimes(1);
            expect(mock_manager.delete).toHaveBeenCalledWith(UserFollows, {
                follower_id,
                followed_id,
            });
            expect(mock_manager.decrement).not.toHaveBeenCalled();
            expect(result).toEqual(mock_delete_result);
        });
    });

    describe('insertMuteRelationship', () => {
        it('should insert mute relationship', async () => {
            const muter_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const muted_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';

            const mock_insert_result = {
                identifiers: [],
                generatedMaps: [],
                raw: [],
            };

            const mock_repository = {
                insert: jest.fn().mockResolvedValueOnce(mock_insert_result),
            };

            const get_repository_spy = jest
                .spyOn(data_source, 'getRepository')
                .mockReturnValue(mock_repository as any);

            const result = await repository.insertMuteRelationship(muter_id, muted_id);

            expect(get_repository_spy).toHaveBeenCalledWith(UserMutes);
            expect(mock_repository.insert).toHaveBeenCalledWith(
                expect.objectContaining({ muter_id, muted_id })
            );
            expect(mock_repository.insert).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_insert_result);
        });
    });

    describe('deleteMuteRelationship', () => {
        it('should delete mute relationship', async () => {
            const muter_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const muted_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';

            const mock_delete_result = {
                affected: 1,
                raw: [],
            };

            const mock_repository = {
                delete: jest.fn().mockResolvedValueOnce(mock_delete_result),
            };

            const get_repository_spy = jest
                .spyOn(data_source, 'getRepository')
                .mockReturnValue(mock_repository as any);

            const result = await repository.deleteMuteRelationship(muter_id, muted_id);

            expect(get_repository_spy).toHaveBeenCalledWith(UserMutes);
            expect(mock_repository.delete).toHaveBeenCalledWith({ muter_id, muted_id });
            expect(mock_repository.delete).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_delete_result);
        });
    });

    describe('insertBlockRelationship', () => {
        it('should insert block relationship and delete follow relationships when both follow each other', async () => {
            const blocker_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const blocked_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';

            const mock_manager = {
                delete: jest
                    .fn()
                    .mockResolvedValueOnce({ affected: 1 })
                    .mockResolvedValueOnce({ affected: 1 }),
                insert: jest.fn().mockResolvedValueOnce({}),
                decrement: jest.fn().mockResolvedValue({}),
            } as any;

            const transaction_spy = jest
                .spyOn(data_source, 'transaction')
                .mockImplementation(async (callback: any) => {
                    return await callback(mock_manager);
                });

            await repository.insertBlockRelationship(blocker_id, blocked_id);

            expect(transaction_spy).toHaveBeenCalledTimes(1);

            expect(mock_manager.delete).toHaveBeenCalledTimes(2);
            expect(mock_manager.delete).toHaveBeenCalledWith(UserFollows, {
                follower_id: blocker_id,
                followed_id: blocked_id,
            });
            expect(mock_manager.delete).toHaveBeenCalledWith(UserFollows, {
                follower_id: blocked_id,
                followed_id: blocker_id,
            });

            expect(mock_manager.insert).toHaveBeenCalledTimes(1);
            expect(mock_manager.insert).toHaveBeenCalledWith(UserBlocks, {
                blocker_id,
                blocked_id,
            });

            expect(mock_manager.decrement).toHaveBeenCalledTimes(2);
            expect(mock_manager.decrement).toHaveBeenCalledWith(
                User,
                [{ id: blocked_id }, { id: blocker_id }],
                'followers',
                1
            );
            expect(mock_manager.decrement).toHaveBeenCalledWith(
                User,
                [{ id: blocker_id }, { id: blocked_id }],
                'following',
                1
            );
        });

        it('should insert block relationship and delete follow relationships when only blocker follows blocked', async () => {
            const blocker_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const blocked_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';

            const mock_manager = {
                delete: jest
                    .fn()
                    .mockResolvedValueOnce({ affected: 1 })
                    .mockResolvedValueOnce({ affected: 0 }),
                insert: jest.fn().mockResolvedValueOnce({}),
                decrement: jest.fn().mockResolvedValue({}),
            } as any;

            const transaction_spy = jest
                .spyOn(data_source, 'transaction')
                .mockImplementation(async (callback: any) => {
                    return await callback(mock_manager);
                });

            await repository.insertBlockRelationship(blocker_id, blocked_id);

            expect(transaction_spy).toHaveBeenCalledTimes(1);

            expect(mock_manager.delete).toHaveBeenCalledTimes(2);
            expect(mock_manager.delete).toHaveBeenCalledWith(UserFollows, {
                follower_id: blocker_id,
                followed_id: blocked_id,
            });
            expect(mock_manager.delete).toHaveBeenCalledWith(UserFollows, {
                follower_id: blocked_id,
                followed_id: blocker_id,
            });

            expect(mock_manager.insert).toHaveBeenCalledTimes(1);
            expect(mock_manager.insert).toHaveBeenCalledWith(UserBlocks, {
                blocker_id,
                blocked_id,
            });

            expect(mock_manager.decrement).toHaveBeenCalledTimes(2);
            expect(mock_manager.decrement).toHaveBeenCalledWith(
                User,
                [{ id: blocked_id }],
                'followers',
                1
            );
            expect(mock_manager.decrement).toHaveBeenCalledWith(
                User,
                [{ id: blocker_id }],
                'following',
                1
            );
        });

        it('should insert block relationship and delete follow relationships when only blocked follows blocker', async () => {
            const blocker_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const blocked_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';

            const mock_manager = {
                delete: jest
                    .fn()
                    .mockResolvedValueOnce({ affected: 0 })
                    .mockResolvedValueOnce({ affected: 1 }),
                insert: jest.fn().mockResolvedValueOnce({}),
                decrement: jest.fn().mockResolvedValue({}),
            } as any;

            const transaction_spy = jest
                .spyOn(data_source, 'transaction')
                .mockImplementation(async (callback: any) => {
                    return await callback(mock_manager);
                });

            await repository.insertBlockRelationship(blocker_id, blocked_id);

            expect(transaction_spy).toHaveBeenCalledTimes(1);

            expect(mock_manager.delete).toHaveBeenCalledTimes(2);
            expect(mock_manager.delete).toHaveBeenCalledWith(UserFollows, {
                follower_id: blocker_id,
                followed_id: blocked_id,
            });
            expect(mock_manager.delete).toHaveBeenCalledWith(UserFollows, {
                follower_id: blocked_id,
                followed_id: blocker_id,
            });

            expect(mock_manager.insert).toHaveBeenCalledTimes(1);
            expect(mock_manager.insert).toHaveBeenCalledWith(UserBlocks, {
                blocker_id,
                blocked_id,
            });

            expect(mock_manager.decrement).toHaveBeenCalledTimes(2);
            expect(mock_manager.decrement).toHaveBeenCalledWith(
                User,
                [{ id: blocker_id }],
                'followers',
                1
            );
            expect(mock_manager.decrement).toHaveBeenCalledWith(
                User,
                [{ id: blocked_id }],
                'following',
                1
            );
        });

        it('should insert block relationship with no follow relationships at all', async () => {
            const blocker_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const blocked_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';

            const mock_manager = {
                delete: jest
                    .fn()
                    .mockResolvedValueOnce({ affected: 0 })
                    .mockResolvedValueOnce({ affected: 0 }),
                insert: jest.fn().mockResolvedValueOnce({}),
                decrement: jest.fn().mockResolvedValue({}),
            } as any;

            const transaction_spy = jest
                .spyOn(data_source, 'transaction')
                .mockImplementation(async (callback: any) => {
                    return await callback(mock_manager);
                });

            await repository.insertBlockRelationship(blocker_id, blocked_id);

            expect(transaction_spy).toHaveBeenCalledTimes(1);

            expect(mock_manager.delete).toHaveBeenCalledTimes(2);
            expect(mock_manager.delete).toHaveBeenCalledWith(UserFollows, {
                follower_id: blocker_id,
                followed_id: blocked_id,
            });
            expect(mock_manager.delete).toHaveBeenCalledWith(UserFollows, {
                follower_id: blocked_id,
                followed_id: blocker_id,
            });

            expect(mock_manager.insert).toHaveBeenCalledTimes(1);
            expect(mock_manager.insert).toHaveBeenCalledWith(UserBlocks, {
                blocker_id,
                blocked_id,
            });

            expect(mock_manager.decrement).not.toHaveBeenCalled();
        });
    });

    describe('deleteBlockRelationship', () => {
        it('should delete block relationship', async () => {
            const blocker_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const blocked_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';

            const mock_delete_result = {
                affected: 1,
                raw: [],
            };

            const mock_repository = {
                delete: jest.fn().mockResolvedValueOnce(mock_delete_result),
            };

            const get_repository_spy = jest
                .spyOn(data_source, 'getRepository')
                .mockReturnValue(mock_repository as any);

            const result = await repository.deleteBlockRelationship(blocker_id, blocked_id);

            expect(get_repository_spy).toHaveBeenCalledWith(UserBlocks);
            expect(mock_repository.delete).toHaveBeenCalledWith({ blocker_id, blocked_id });
            expect(mock_repository.delete).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_delete_result);
        });
    });

    describe('validateRelationshipRequest', () => {
        it('should return user exists and relationship exists when both are true for follow relationship', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';
            const relationship_type = RelationshipType.FOLLOW;

            const mock_query_builder = {
                select: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                setParameter: jest.fn().mockReturnThis(),
                getRawOne: jest.fn().mockResolvedValueOnce({
                    user_exists: target_user_id,
                    relationship_exists: true,
                }),
            };

            const create_query_builder_spy = jest
                .spyOn(repository, 'createQueryBuilder')
                .mockReturnValue(mock_query_builder as any);

            const result = await repository.validateRelationshipRequest(
                current_user_id,
                target_user_id,
                relationship_type
            );

            expect(create_query_builder_spy).toHaveBeenCalledWith('user');
            expect(mock_query_builder.select).toHaveBeenCalledWith('user.id', 'user_exists');
            expect(mock_query_builder.addSelect).toHaveBeenCalledWith(
                expect.stringContaining('user_follows'),
                'relationship_exists'
            );
            expect(mock_query_builder.where).toHaveBeenCalledWith('user.id = :target_user_id');
            expect(mock_query_builder.setParameter).toHaveBeenCalledWith(
                'current_user_id',
                current_user_id
            );
            expect(mock_query_builder.setParameter).toHaveBeenCalledWith(
                'target_user_id',
                target_user_id
            );
            expect(result).toEqual({
                user_exists: target_user_id,
                relationship_exists: true,
            });
        });

        it('should return user exists and relationship does not exist for mute relationship', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';
            const relationship_type = RelationshipType.MUTE;

            const mock_query_builder = {
                select: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                setParameter: jest.fn().mockReturnThis(),
                getRawOne: jest.fn().mockResolvedValueOnce({
                    user_exists: target_user_id,
                    relationship_exists: false,
                }),
            };

            const create_query_builder_spy = jest
                .spyOn(repository, 'createQueryBuilder')
                .mockReturnValue(mock_query_builder as any);

            const result = await repository.validateRelationshipRequest(
                current_user_id,
                target_user_id,
                relationship_type
            );

            expect(create_query_builder_spy).toHaveBeenCalledWith('user');
            expect(mock_query_builder.addSelect).toHaveBeenCalledWith(
                expect.stringContaining('user_mutes'),
                'relationship_exists'
            );
            expect(result).toEqual({
                user_exists: target_user_id,
                relationship_exists: false,
            });
        });

        it('should return user does not exist and relationship does not exist for block relationship', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';
            const relationship_type = RelationshipType.BLOCK;

            const mock_query_builder = {
                select: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                setParameter: jest.fn().mockReturnThis(),
                getRawOne: jest.fn().mockResolvedValueOnce(null),
            };

            const create_query_builder_spy = jest
                .spyOn(repository, 'createQueryBuilder')
                .mockReturnValue(mock_query_builder as any);

            const result = await repository.validateRelationshipRequest(
                current_user_id,
                target_user_id,
                relationship_type
            );

            expect(create_query_builder_spy).toHaveBeenCalledWith('user');
            expect(mock_query_builder.addSelect).toHaveBeenCalledWith(
                expect.stringContaining('user_blocks'),
                'relationship_exists'
            );
            expect(result).toBeNull();
        });
    });

    describe('verifyFollowPermissions', () => {
        it('should return blocked_me true and is_blocked false when target user has blocked current user', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';

            const mock_blocks = [
                {
                    blocker_id: target_user_id,
                    blocked_id: current_user_id,
                },
            ];

            const mock_query_builder = {
                select: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                setParameters: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValueOnce(mock_blocks),
            };

            const mock_repository = {
                createQueryBuilder: jest.fn().mockReturnValue(mock_query_builder),
            };

            const get_repository_spy = jest
                .spyOn(data_source, 'getRepository')
                .mockReturnValue(mock_repository as any);

            const result = await repository.verifyFollowPermissions(
                current_user_id,
                target_user_id
            );

            expect(get_repository_spy).toHaveBeenCalledWith(UserBlocks);
            expect(mock_repository.createQueryBuilder).toHaveBeenCalledWith('ub');
            expect(mock_query_builder.select).toHaveBeenCalledWith([
                'ub.blocker_id',
                'ub.blocked_id',
            ]);
            expect(mock_query_builder.setParameters).toHaveBeenCalledWith({
                current_user_id,
                target_user_id,
            });
            expect(result).toEqual({
                blocked_me: true,
                is_blocked: false,
            });
        });

        it('should return blocked_me false and is_blocked true when current user has blocked target user', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';

            const mock_blocks = [
                {
                    blocker_id: current_user_id,
                    blocked_id: target_user_id,
                },
            ];

            const mock_query_builder = {
                select: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                setParameters: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValueOnce(mock_blocks),
            };

            const mock_repository = {
                createQueryBuilder: jest.fn().mockReturnValue(mock_query_builder),
            };

            const get_repository_spy = jest
                .spyOn(data_source, 'getRepository')
                .mockReturnValue(mock_repository as any);

            const result = await repository.verifyFollowPermissions(
                current_user_id,
                target_user_id
            );

            expect(get_repository_spy).toHaveBeenCalledWith(UserBlocks);
            expect(result).toEqual({
                blocked_me: false,
                is_blocked: true,
            });
        });

        it('should return both blocked_me and is_blocked true when both users have blocked each other', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';

            const mock_blocks = [
                {
                    blocker_id: current_user_id,
                    blocked_id: target_user_id,
                },
                {
                    blocker_id: target_user_id,
                    blocked_id: current_user_id,
                },
            ];

            const mock_query_builder = {
                select: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                setParameters: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValueOnce(mock_blocks),
            };

            const mock_repository = {
                createQueryBuilder: jest.fn().mockReturnValue(mock_query_builder),
            };

            const get_repository_spy = jest
                .spyOn(data_source, 'getRepository')
                .mockReturnValue(mock_repository as any);

            const result = await repository.verifyFollowPermissions(
                current_user_id,
                target_user_id
            );

            expect(get_repository_spy).toHaveBeenCalledWith(UserBlocks);
            expect(result).toEqual({
                blocked_me: true,
                is_blocked: true,
            });
        });

        it('should return both blocked_me and is_blocked false when no blocks exist', async () => {
            const current_user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const target_user_id = 'b2d59899-f706-4c8f-97d7-ba2e9fc22d90';

            const mock_query_builder = {
                select: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                setParameters: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValueOnce([]),
            };

            const mock_repository = {
                createQueryBuilder: jest.fn().mockReturnValue(mock_query_builder),
            };

            const get_repository_spy = jest
                .spyOn(data_source, 'getRepository')
                .mockReturnValue(mock_repository as any);

            const result = await repository.verifyFollowPermissions(
                current_user_id,
                target_user_id
            );

            expect(get_repository_spy).toHaveBeenCalledWith(UserBlocks);
            expect(result).toEqual({
                blocked_me: false,
                is_blocked: false,
            });
        });
    });

    describe('getRelationshipConfig', () => {
        it('should return correct config for FOLLOW relationship type', () => {
            const result = repository['getRelationshipConfig'](RelationshipType.FOLLOW);

            expect(result).toEqual({
                table_name: 'user_follows',
                source_column: 'follower_id',
                target_column: 'followed_id',
            });
        });

        it('should return correct config for MUTE relationship type', () => {
            const result = repository['getRelationshipConfig'](RelationshipType.MUTE);

            expect(result).toEqual({
                table_name: 'user_mutes',
                source_column: 'muter_id',
                target_column: 'muted_id',
            });
        });

        it('should return correct config for BLOCK relationship type', () => {
            const result = repository['getRelationshipConfig'](RelationshipType.BLOCK);

            expect(result).toEqual({
                table_name: 'user_blocks',
                source_column: 'blocker_id',
                target_column: 'blocked_id',
            });
        });

        it('should throw error for unknown relationship type', () => {
            const unknown_type = 'UNKNOWN' as RelationshipType;

            expect(() => {
                repository['getRelationshipConfig'](unknown_type);
            }).toThrow('Unknown relationship type');
        });
    });

    describe('insertUserInterests', () => {
        it('should insert user interests successfully', async () => {
            const user_interests = [
                { user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d', category_id: 1 },
                { user_id: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d', category_id: 2 },
            ];

            const mock_upsert_result = {
                identifiers: [],
                generatedMaps: [],
                raw: [],
            };

            const mock_repository = {
                upsert: jest.fn().mockResolvedValueOnce(mock_upsert_result),
            };

            const get_repository_spy = jest
                .spyOn(data_source, 'getRepository')
                .mockReturnValue(mock_repository as any);

            const result = await repository.insertUserInterests(user_interests);

            expect(get_repository_spy).toHaveBeenCalledWith(UserInterests);
            expect(mock_repository.upsert).toHaveBeenCalledWith(user_interests, {
                conflictPaths: ['user_id', 'category_id'],
                skipUpdateIfNoValuesChanged: true,
            });
            expect(mock_repository.upsert).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mock_upsert_result);
        });

        it('should handle empty user interests array', async () => {
            const user_interests = [];

            const mock_upsert_result = {
                identifiers: [],
                generatedMaps: [],
                raw: [],
            };

            const mock_repository = {
                upsert: jest.fn().mockResolvedValueOnce(mock_upsert_result),
            };

            const get_repository_spy = jest
                .spyOn(data_source, 'getRepository')
                .mockReturnValue(mock_repository as any);

            const result = await repository.insertUserInterests(user_interests);

            expect(get_repository_spy).toHaveBeenCalledWith(UserInterests);
            expect(mock_repository.upsert).toHaveBeenCalledWith([], {
                conflictPaths: ['user_id', 'category_id'],
                skipUpdateIfNoValuesChanged: true,
            });
            expect(result).toEqual(mock_upsert_result);
        });
    });
});
