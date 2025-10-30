import { Injectable } from '@nestjs/common';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { User } from './entities/user.entity';
import { UserListItemDto } from './dto/user-list-item.dto';

@Injectable()
export class UserRepository extends Repository<User> {
    constructor(private dataSource: DataSource) {
        super(User, dataSource.createEntityManager());
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

    buildProfileQuery(
        identifier: string,
        identifier_type: 'id' | 'username',
        viewer_id?: string | null
    ): SelectQueryBuilder<User> {
        const query = this.createQueryBuilder('user')
            .leftJoin('user_follows', 'followers', 'followers.followed_id = user.id')
            .leftJoin('user_follows', 'following', 'following.follower_id = user.id')
            .select([
                'user.id AS user_id',
                'user.name AS name',
                'user.username AS username',
                'user.bio AS bio',
                'user.avatar_url AS avatar_url',
                'user.cover_url AS cover_url',
                'user.country AS country',
                'user.created_at AS created_at',
                'COUNT(DISTINCT followers.follower_id) AS followers_count',
                'COUNT(DISTINCT following.followed_id) AS following_count',
            ]);

        if (identifier_type === 'id') {
            query.where('user.id = :identifier', { identifier });
        } else {
            query.where('user.username = :identifier', { identifier });
            console.log(identifier);
        }

        // For authenticated viewer users
        if (viewer_id) {
            query
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
                    `( SELECT COALESCE(json_agg(row_to_json(mu)), '[]'::json)
           FROM (
             SELECT mu.name        AS name,
                    mu.avatar_url  AS avatar_url
               FROM "user" mu
               JOIN user_follows tf ON tf.follower_id = mu.id AND tf.followed_id = "user"."id"
               JOIN user_follows vf ON vf.followed_id = mu.id AND vf.follower_id = :viewer_id
              LIMIT 3
           ) mu )`,
                    'top_mutual_followers'
                )
                .setParameter('viewer_id', viewer_id);
        }

        return query
            .groupBy('user.id')
            .addGroupBy('user.name')
            .addGroupBy('user.username')
            .addGroupBy('user.bio')
            .addGroupBy('user.avatar_url')
            .addGroupBy('user.cover_url')
            .addGroupBy('user.country')
            .addGroupBy('user.created_at');
    }

    buildUserListQuery(current_user_id: string): SelectQueryBuilder<User> {
        const query = this.createQueryBuilder('user')
            .select([
                '"user"."id" AS user_id',
                'user.name AS name',
                'user.username AS username',
                'user.bio AS bio',
                'user.avatar_url AS avatar_url',
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

    async getFollowersList(
        current_user_id: string,
        target_user_id: string,
        page_offset: number,
        page_size: number,
        following?: boolean
    ): Promise<UserListItemDto[]> {
        const query = this.buildUserListQuery(current_user_id);

        query
            .innerJoin(
                'user_follows',
                'target_followers',
                'target_followers.follower_id = "user"."id" AND target_followers.followed_id = :target_user_id'
            )
            .setParameter('target_user_id', target_user_id);

        if (following === true) {
            query.innerJoin(
                'user_follows',
                'current_user_following',
                'current_user_following.follower_id = :current_user_id AND current_user_following.followed_id = "user"."id"'
            );
        }

        return await query.limit(page_size).offset(page_offset).getRawMany();
    }

    async getFollowingList(
        current_user_id: string,
        target_user_id: string,
        page_offset: number,
        page_size: number
    ): Promise<UserListItemDto[]> {
        const query = this.buildUserListQuery(current_user_id);

        return await query
            .innerJoin(
                'user_follows',
                'target_following',
                'target_following.follower_id = :target_user_id AND target_following.followed_id = "user"."id"'
            )
            .setParameter('target_user_id', target_user_id)
            .limit(page_size)
            .offset(page_offset)
            .getRawMany();
    }

    async getMutedUsersList(
        current_user_id: string,
        page_offset: number,
        page_size: number
    ): Promise<UserListItemDto[]> {
        const query = this.buildUserListQuery(current_user_id);

        return await query
            .innerJoin(
                'user_mutes',
                'target_muted',
                'target_muted.muter_id = :current_user_id AND target_muted.muted_id = "user"."id"'
            )
            .setParameter('current_user_id', current_user_id)
            .limit(page_size)
            .offset(page_offset)
            .getRawMany();
    }

    async getBlockedUsersList(
        current_user_id: string,
        page_offset: number,
        page_size: number
    ): Promise<UserListItemDto[]> {
        const query = this.buildUserListQuery(current_user_id);

        return await query
            .innerJoin(
                'user_blocks',
                'target_blocked',
                'target_blocked.blocker_id = :current_user_id AND target_blocked.blocked_id = "user"."id"'
            )
            .setParameter('current_user_id', current_user_id)
            .limit(page_size)
            .offset(page_offset)
            .getRawMany();
    }
}
