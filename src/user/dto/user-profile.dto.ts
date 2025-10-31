import { Expose, Transform } from 'class-transformer';

export class UserProfileDto {
    @Transform(({ value, obj }) => value || obj.id)
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
    country?: string;

    @Expose()
    created_at: Date;

    @Expose()
    @Transform(({ value }) => Number(value) || 0)
    followers_count: number;

    @Expose()
    @Transform(({ value }) => Number(value) || 0)
    following_count: number;
}
