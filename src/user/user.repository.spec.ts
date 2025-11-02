import { DataSource } from 'typeorm';
import { UserRepository } from './user.repository';
import { User } from './entities';
import { Test, TestingModule } from '@nestjs/testing';
import { UserProfileDto } from './dto/user-profile.dto';
import { DetailedUserProfileDto } from './dto/detailed-user-profile.dto';

describe('UserRepository', () => {
    let repository: UserRepository;
    let data_source: jest.Mocked<DataSource>;
    let entity_manager: any;

    beforeEach(async () => {
        entity_manager = {
            save: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        };

        data_source = {
            createEntityManager: jest.fn().mockReturnValue(entity_manager),
        } as any;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserRepository,
                {
                    provide: DataSource,
                    useValue: data_source,
                },
            ],
        }).compile();

        repository = module.get<UserRepository>(UserRepository);
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
});
