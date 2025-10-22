import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { UserProfileDto } from './dto/user-profile.dto';
import { plainToInstance } from 'class-transformer';
import { ERROR_MESSAGES } from 'src/constants/swagger-messages';
import { SelectQueryBuilder } from 'typeorm/browser';
import { DetailedUserProfileDto } from './dto/detailed-user-profile.dto';
import { MutualFollowerDto } from './dto/mutual-follower.dto';

@Injectable()
export class UserService {
    constructor(@InjectRepository(User) private readonly user_repository: Repository<User>) {}

    // Auth

    async findUserById(id: string) {
        return await this.user_repository.findOne({ where: { id } });
    }

    async findUserByEmail(email: string) {
        return await this.user_repository.findOne({ where: { email } });
    }

    async findUserByGithubId(github_id: string) {
        return await this.user_repository.findOne({
            where: { github_id: github_id },
        });
    }

    async findUserByFacebookId(facebook_id: string) {
        return await this.user_repository.findOne({
            where: { facebook_id: facebook_id },
        });
    }

    async findUserByGoogleId(google_id: string) {
        return await this.user_repository.findOne({
            where: { google_id: google_id },
        });
    }

    async findUserByUsername(username: string) {
        return await this.user_repository.findOne({
            where: { username: username },
        });
    }

    async findUserByPhoneNumber(phone_number: string) {
        return await this.user_repository.findOne({
            where: { phone_number: phone_number },
        });
    }

    async createUser(create_user_dto: CreateUserDto): Promise<User> {
        const user = new User({
            ...create_user_dto,
        });
        return await this.user_repository.save(user);
    }

    async updateUser(id: string, update_data: Partial<User>) {
        await this.user_repository.update(id, update_data);
        return await this.findUserById(id);
    }

    async updateUserPassword(id: string, new_password: string) {
        await this.user_repository.update(id, { password: new_password });
        return await this.findUserById(id);
    }

    async getMe(user_id: string): Promise<UserProfileDto> {
        const result = await this.buildProfileQuery(user_id, 'id').getRawOne<UserProfileDto>();

        if (!result) {
            throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
        }

        return plainToInstance(UserProfileDto, result, {
            enableImplicitConversion: true,
        });
    }

    async getUserById(
        current_user_id: string | null,
        target_user_id: string
    ): Promise<DetailedUserProfileDto> {
        const result = await this.buildProfileQuery(
            target_user_id,
            'id',
            current_user_id
        ).getRawOne<DetailedUserProfileDto>();

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
        const result = await this.buildProfileQuery(
            target_username,
            'username',
            current_user_id
        ).getRawOne<DetailedUserProfileDto>();

        if (!result) {
            throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
        }

        return plainToInstance(DetailedUserProfileDto, result, {
            enableImplicitConversion: true,
        });
    }

    private buildProfileQuery(
        identifier: string,
        identifier_type: 'id' | 'username',
        viewer_id?: string | null
    ) {
        const query = this.user_repository
            .createQueryBuilder('user')
            .leftJoin('user_follows', 'followers', 'followers.followed_id = user.id')
            .leftJoin('user_follows', 'following', 'following.follower_id = user.id')
            .select([
                'user.id AS user_id',
                'user.name AS name',
                'user.username AS username',
                'user.bio AS bio',
                'user.avatar_url AS avatar_url',
                'user.cover_url AS cover_url',
                // country to be added
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

        return (
            query
                .groupBy('user.id')
                .addGroupBy('user.name')
                .addGroupBy('user.username')
                .addGroupBy('user.bio')
                .addGroupBy('user.avatar_url')
                .addGroupBy('user.cover_url')
                // country to be added
                .addGroupBy('user.created_at')
        );
    }
}
