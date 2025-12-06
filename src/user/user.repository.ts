import { Injectable } from '@nestjs/common';
import { DataSource, DeleteResult, Repository, SelectQueryBuilder } from 'typeorm';
import { User } from './entities/user.entity';
import { UserListItemDto } from './dto/user-list-item.dto';
import { UserBlocks, UserFollows, UserMutes } from './entities';
import { InsertResult } from 'typeorm/browser';
import { RelationshipType } from './enums/relationship-type.enum';
import { UserInterests } from './entities/user-interests.entity';
import { UserProfileDto } from './dto/user-profile.dto';
import { DetailedUserProfileDto } from './dto/detailed-user-profile.dto';
import { PaginationService } from 'src/shared/services/pagination/pagination.service';

@Injectable()
export class UserRepository extends Repository<User> {
    constructor(
        private data_source: DataSource,
        private readonly paginate_service: PaginationService
    ) {
        super(User, data_source.createEntityManager());
    }

    async findById(id: string): Promise<User | null> {
        return await this.findOne({ where: { id } });
    }

    async findByEmail(email: string): Promise<User | null> {
        return await this.findOne({ where: { email } });
    }

    async findByGithubId(github_id: string): Promise<User | null> {
        return await this.findOne({ where: { github_id } });
    }

    async findByFacebookId(facebook_id: string): Promise<User | null> {
        return await this.findOne({ where: { facebook_id } });
    }

    async findByGoogleId(google_id: string): Promise<User | null> {
        return await this.findOne({ where: { google_id } });
    }

    async findByUsername(username: string): Promise<User | null> {
        return await this.findOne({ where: { username } });
    }

    async findByPhoneNumber(phone_number: string): Promise<User | null> {
        return await this.findOne({ where: { phone_number } });
    }

    async createUser(user_data: Partial<User>): Promise<User> {
        const user = new User(user_data);
        return await this.save(user);
    }

    async updateUserById(id: string, update_data: Partial<User>): Promise<User | null> {
        await this.update(id, update_data);
        return await this.findById(id);
    }

    async updatePassword(id: string, new_password: string): Promise<User | null> {
        await this.update(id, { password: new_password });
        return await this.findById(id);
    }

    async getMyProfile(current_user_id: string): Promise<UserProfileDto | null> {
        const query = this.buildProfileQuery(current_user_id, 'id');
        query.addSelect('user.email AS email');
        query.addSelect((sub_query) => {
            return sub_query
                .select('COUNT(*)', 'count')
                .from('tweet_likes', 'tl')
                .where('tl.user_id = user.id');
        }, 'num_likes');

        const profile = await query.getRawOne<UserProfileDto>();
        return profile ?? null;
    }

    async getProfileById(
        current_user_id: string | null,
        target_user_id: string
    ): Promise<DetailedUserProfileDto | null> {
        const base_profile_query = this.buildProfileQuery(target_user_id, 'id');

        let profile;
        if (!current_user_id) {
            profile = await base_profile_query.getRawOne<UserProfileDto>();
        } else {
            profile = await this.addViewerContextToProfileQuery(
                base_profile_query,
                current_user_id
            ).getRawOne<DetailedUserProfileDto>();
        }

        return profile ?? null;
    }

    async getProfileByUsername(
        current_user_id: string | null,
        target_username: string
    ): Promise<DetailedUserProfileDto | null> {
        const base_profile_query = this.buildProfileQuery(target_username, 'username');

        let profile;
        if (!current_user_id) {
            profile = await base_profile_query.getRawOne<UserProfileDto>();
        } else {
            profile = await this.addViewerContextToProfileQuery(
                base_profile_query,
                current_user_id
            ).getRawOne<DetailedUserProfileDto>();
        }

        return profile ?? null;
    }

    buildProfileQuery(
        identifier: string,
        identifier_type: 'id' | 'username'
    ): SelectQueryBuilder<User> {
        const query = this.createQueryBuilder('user').select([
            'user.id AS user_id',
            'user.name AS name',
            'user.username AS username',
            'user.bio AS bio',
            'user.avatar_url AS avatar_url',
            'user.cover_url AS cover_url',
            'user.country AS country',
            'user.created_at AS created_at',
            'user.birth_date AS birth_date',
            'user.followers AS followers_count',
            'user.following AS following_count',
        ]);

        query.addSelect((sub_query) => {
            return sub_query
                .select('COUNT(*)', 'count')
                .from('tweets', 't')
                .where('t.user_id = user.id')
                .andWhere("t.type = 'reply'")
                .andWhere('t.deleted_at IS NULL');
        }, 'num_replies');

        query.addSelect(
            `(
            (SELECT COUNT(*) FROM tweets t WHERE t.user_id = user.id AND t.type != 'reply' AND t.deleted_at IS NULL) +
            (SELECT COUNT(*) FROM tweet_reposts r WHERE r.user_id = user.id)
            )`,
            'num_posts'
        );

        query.addSelect((sub_query) => {
            return sub_query
                .select('COUNT(*)', 'count')
                .from('tweets', 't')
                .where('t.user_id = user.id')
                .andWhere('(array_length(t.images, 1) > 0 OR array_length(t.videos, 1) > 0)')
                .andWhere('t.deleted_at IS NULL');
        }, 'num_media');

        if (identifier_type === 'id') {
            query.where('user.id = :identifier', { identifier });
        } else {
            query.where('user.username = :identifier', { identifier });
        }

        return query
            .groupBy('user.id')
            .addGroupBy('user.name')
            .addGroupBy('user.username')
            .addGroupBy('user.bio')
            .addGroupBy('user.avatar_url')
            .addGroupBy('user.cover_url')
            .addGroupBy('user.country')
            .addGroupBy('user.created_at')
            .addGroupBy('user.followers')
            .addGroupBy('user.following');
    }

    addViewerContextToProfileQuery(
        query: SelectQueryBuilder<User>,
        viewer_id: string
    ): SelectQueryBuilder<User> {
        return query
            .addSelect(
                `EXISTS(
                SELECT 1 FROM user_follows 
                WHERE follower_id = :viewer_id AND followed_id = "user"."id"
            )`,
                'is_following'
            )
            .addSelect(
                `EXISTS(
                SELECT 1 FROM user_follows
                WHERE follower_id = "user"."id" AND followed_id = :viewer_id
            )`,
                'is_follower'
            )
            .addSelect(
                `EXISTS(
                SELECT 1 FROM user_mutes
                WHERE muter_id = :viewer_id AND muted_id = "user"."id"
            )`,
                'is_muted'
            )
            .addSelect(
                `EXISTS(
                SELECT 1 FROM user_blocks
                WHERE blocker_id = :viewer_id AND blocked_id = "user"."id"
            )`,
                'is_blocked'
            )
            .addSelect(
                `(
                SELECT COUNT(*)
                FROM user_follows viewer_following
                INNER JOIN user_follows target_followers
                    ON viewer_following.followed_id = target_followers.follower_id
                WHERE viewer_following.follower_id = :viewer_id
                    AND target_followers.followed_id = "user"."id"
            )`,
                'mutual_followers_count'
            )
            .addSelect(
                `(
                SELECT COALESCE(json_agg(row_to_json(mu)), '[]'::json)
                FROM (
                    SELECT mu.name AS name,
                           mu.avatar_url AS avatar_url
                    FROM "user" mu
                    JOIN user_follows tf ON tf.follower_id = mu.id AND tf.followed_id = "user"."id"
                    JOIN user_follows vf ON vf.followed_id = mu.id AND vf.follower_id = :viewer_id
                    LIMIT 3
                ) mu
            )`,
                'top_mutual_followers'
            )
            .setParameter('viewer_id', viewer_id);
    }

    buildUserListQuery(current_user_id: string): SelectQueryBuilder<User> {
        const query = this.createQueryBuilder('user')
            .select([
                '"user"."id" AS user_id',
                'user.name AS name',
                'user.username AS username',
                'user.bio AS bio',
                'user.avatar_url AS avatar_url',
                'user.cover_url AS cover_url',
                'user.verified AS verified',
                'user.followers AS followers',
                'user.following AS following',
            ])
            .addSelect(
                `CASE WHEN EXISTS(
                SELECT 1 FROM user_follows uf
                WHERE uf.follower_id = :current_user_id AND uf.followed_id = "user"."id"
              ) THEN true ELSE false END`,
                'is_following'
            )
            .addSelect(
                `CASE WHEN EXISTS(
                SELECT 1 FROM user_follows uf
                WHERE uf.follower_id = "user"."id" AND uf.followed_id = :current_user_id
              ) THEN true ELSE false END`,
                'is_follower'
            )
            .addSelect(
                `CASE WHEN EXISTS(
                SELECT 1 FROM user_mutes um
                WHERE um.muter_id = :current_user_id AND um.muted_id = "user"."id"
              ) THEN true ELSE false END`,
                'is_muted'
            )
            .addSelect(
                `CASE WHEN EXISTS(
                SELECT 1 FROM user_blocks ub
                WHERE ub.blocker_id = :current_user_id AND ub.blocked_id = "user"."id"
              ) THEN true ELSE false END`,
                'is_blocked'
            )
            .setParameter('current_user_id', current_user_id);

        return query;
    }

    async getUsersByIds(
        user_ids: string[],
        current_user_id: string | null
    ): Promise<UserListItemDto[]> {
        let query;

        if (current_user_id) {
            query = this.buildUserListQuery(current_user_id);
        } else {
            query = this.createQueryBuilder('user').select([
                '"user"."id" AS user_id',
                'user.name AS name',
                'user.username AS username',
                'user.bio AS bio',
                'user.avatar_url AS avatar_url',
                'user.cover_url AS cover_url',
                'user.verified AS verified',
                'user.followers AS followers',
                'user.following AS following',
            ]);
        }

        return await query.where('"user"."id" IN (:...user_ids)', { user_ids }).getRawMany();
    }

    async getUsersByUsernames(
        usernames: string[],
        current_user_id: string | null
    ): Promise<UserListItemDto[]> {
        let query;

        if (current_user_id) {
            query = this.buildUserListQuery(current_user_id);
        } else {
            query = this.createQueryBuilder('user').select([
                '"user"."id" AS user_id',
                'user.name AS name',
                'user.username AS username',
                'user.bio AS bio',
                'user.avatar_url AS avatar_url',
                'user.cover_url AS cover_url',
                'user.verified AS verified',
                'user.followers AS followers',
                'user.following AS following',
            ]);
        }

        return await query
            .where('"user"."username" IN (:...usernames)', { usernames })
            .getRawMany();
    }

    async getFollowersList(
        current_user_id: string,
        target_user_id: string,
        cursor?: string,
        limit: number = 20,
        following?: boolean
    ): Promise<UserListItemDto[]> {
        let query = this.buildUserListQuery(current_user_id);

        query
            .addSelect('target_followers.created_at', 'created_at')
            .innerJoin(
                'user_follows',
                'target_followers',
                'target_followers.follower_id = "user"."id" AND target_followers.followed_id = :target_user_id'
            )
            .setParameter('target_user_id', target_user_id)
            .orderBy('target_followers.created_at', 'DESC')
            .addOrderBy('target_followers.follower_id', 'DESC')
            .limit(limit);

        if (following === true) {
            query.innerJoin(
                'user_follows',
                'current_user_following',
                'current_user_following.follower_id = :current_user_id AND current_user_following.followed_id = "user"."id"'
            );
        }

        query = this.paginate_service.applyCursorPagination(
            query,
            cursor,
            'target_followers',
            'created_at',
            'follower_id'
        );

        return await query.getRawMany();
    }

    async getFollowingList(
        current_user_id: string,
        target_user_id: string,
        cursor?: string,
        limit: number = 20
    ): Promise<UserListItemDto[]> {
        let query = this.buildUserListQuery(current_user_id);

        query
            .addSelect('target_following.created_at', 'created_at')
            .innerJoin(
                'user_follows',
                'target_following',
                'target_following.follower_id = :target_user_id AND target_following.followed_id = "user"."id"'
            )
            .setParameter('target_user_id', target_user_id)
            .orderBy('target_following.created_at', 'DESC')
            .addOrderBy('target_following.followed_id', 'DESC')
            .limit(limit);

        query = this.paginate_service.applyCursorPagination(
            query,
            cursor,
            'target_following',
            'created_at',
            'followed_id'
        );

        return await query.getRawMany();
    }

    async getMutedUsersList(
        current_user_id: string,
        cursor?: string,
        limit: number = 20
    ): Promise<UserListItemDto[]> {
        let query = this.buildUserListQuery(current_user_id);

        query
            .addSelect('target_muted.created_at', 'created_at')
            .innerJoin(
                'user_mutes',
                'target_muted',
                'target_muted.muter_id = :current_user_id AND target_muted.muted_id = "user"."id"'
            )
            .setParameter('current_user_id', current_user_id)
            .orderBy('target_muted.created_at', 'DESC')
            .addOrderBy('target_muted.muted_id', 'DESC')
            .limit(limit);

        query = this.paginate_service.applyCursorPagination(
            query,
            cursor,
            'target_muted',
            'created_at',
            'muted_id'
        );
        return await query.getRawMany();
    }

    async getBlockedUsersList(
        current_user_id: string,
        cursor?: string,
        limit: number = 20
    ): Promise<UserListItemDto[]> {
        let query = this.buildUserListQuery(current_user_id);

        query
            .addSelect('target_blocked.created_at', 'created_at')
            .innerJoin(
                'user_blocks',
                'target_blocked',
                'target_blocked.blocker_id = :current_user_id AND target_blocked.blocked_id = "user"."id"'
            )
            .setParameter('current_user_id', current_user_id)
            .orderBy('target_blocked.created_at', 'DESC')
            .addOrderBy('target_blocked.blocked_id', 'DESC')
            .limit(limit);

        query = this.paginate_service.applyCursorPagination(
            query,
            cursor,
            'target_blocked',
            'created_at',
            'blocked_id'
        );

        return await query.getRawMany();
    }

    async insertFollowRelationship(
        follower_id: string,
        followed_id: string
    ): Promise<InsertResult> {
        const user_follows = new UserFollows({ follower_id, followed_id });
        return await this.data_source.getRepository(UserFollows).insert(user_follows);
    }

    async deleteFollowRelationship(
        follower_id: string,
        followed_id: string
    ): Promise<DeleteResult> {
        return await this.data_source
            .getRepository(UserFollows)
            .delete({ follower_id, followed_id });
    }

    async insertMuteRelationship(muter_id: string, muted_id: string): Promise<InsertResult> {
        const user_mutes = new UserMutes({ muter_id, muted_id });
        return await this.data_source.getRepository(UserMutes).insert(user_mutes);
    }

    async deleteMuteRelationship(muter_id: string, muted_id: string): Promise<DeleteResult> {
        return await this.data_source.getRepository(UserMutes).delete({ muter_id, muted_id });
    }

    async insertBlockRelationship(blocker_id: string, blocked_id: string) {
        await this.data_source.transaction(async (manager) => {
            await manager.delete(UserFollows, { follower_id: blocker_id, followed_id: blocked_id });
            await manager.delete(UserFollows, { follower_id: blocked_id, followed_id: blocker_id });
            await manager.insert(UserBlocks, { blocker_id, blocked_id });
        });
    }

    async deleteBlockRelationship(blocker_id: string, blocked_id: string): Promise<DeleteResult> {
        return await this.data_source.getRepository(UserBlocks).delete({ blocker_id, blocked_id });
    }

    async validateRelationshipRequest(
        current_user_id: string,
        target_user_id: string,
        relationship_type: RelationshipType
    ): Promise<any> {
        const { table_name, source_column, target_column } =
            this.getRelationshipConfig(relationship_type);

        return this.createQueryBuilder('user')
            .select([
                'user.id AS user_exists',
                'user.avatar_url AS avatar_url',
                'user.name AS name',
            ])
            .addSelect(
                `EXISTS(
                    SELECT 1 FROM ${table_name} ur
                    WHERE ur.${source_column} = :current_user_id 
                    AND ur.${target_column} = :target_user_id
                )`,
                'relationship_exists'
            )
            .where('user.id = :target_user_id')
            .setParameter('current_user_id', current_user_id)
            .setParameter('target_user_id', target_user_id)
            .getRawOne();
    }

    async verifyFollowPermissions(current_user_id: string, target_user_id: string): Promise<any> {
        const blocks = await this.data_source
            .getRepository(UserBlocks)
            .createQueryBuilder('ub')
            .select(['ub.blocker_id', 'ub.blocked_id'])
            .where(
                '(ub.blocker_id = :target_user_id AND ub.blocked_id = :current_user_id) OR ' +
                    '(ub.blocker_id = :current_user_id AND ub.blocked_id = :target_user_id)'
            )
            .setParameters({ current_user_id, target_user_id })
            .getMany();

        return {
            blocked_me: blocks.some(
                (b) => b.blocker_id === target_user_id && b.blocked_id === current_user_id
            ),
            is_blocked: blocks.some(
                (b) => b.blocker_id === current_user_id && b.blocked_id === target_user_id
            ),
        };
    }

    private getRelationshipConfig(relationship_type: RelationshipType): {
        table_name: string;
        source_column: string;
        target_column: string;
    } {
        switch (relationship_type) {
            case RelationshipType.FOLLOW:
                return {
                    table_name: 'user_follows',
                    source_column: 'follower_id',
                    target_column: 'followed_id',
                };
            case RelationshipType.MUTE:
                return {
                    table_name: 'user_mutes',
                    source_column: 'muter_id',
                    target_column: 'muted_id',
                };
            case RelationshipType.BLOCK:
                return {
                    table_name: 'user_blocks',
                    source_column: 'blocker_id',
                    target_column: 'blocked_id',
                };
            default:
                throw new Error('Unknown relationship type');
        }
    }

    async insertUserInterests(user_interests) {
        return await this.data_source.getRepository(UserInterests).upsert(user_interests, {
            conflictPaths: ['user_id', 'category_id'],
            skipUpdateIfNoValuesChanged: true,
        });
    }

    async getUserInterests(user_id: string): Promise<{ category_id: number; score: number }[]> {
        return this.data_source
            .createQueryBuilder()
            .select('category_id')
            .addSelect('COALESCE(score, 0)', 'score')
            .from(UserInterests, 'ui')
            .where('ui.user_id = :user_id', { user_id })
            .orderBy('score', 'DESC')
            .getRawMany();
    }
}
