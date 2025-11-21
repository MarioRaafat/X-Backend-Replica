import { Expose } from 'class-transformer';

export class UserListItemDto {
    @Expose()
    user_id: string;

    @Expose()
    name: string;

    @Expose()
    username: string;

    @Expose()
    bio?: string;

    @Expose()
    avatar_url?: string;

    @Expose()
    cover_url?: string;

    @Expose()
    verified: boolean;

    @Expose()
    followers: number;

    @Expose()
    following: number;

    @Expose()
    is_following?: boolean;

    @Expose()
    is_follower?: boolean;

    @Expose()
    is_muted?: boolean;

    @Expose()
    is_blocked?: boolean;
}
