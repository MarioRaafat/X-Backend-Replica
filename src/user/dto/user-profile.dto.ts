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
    bio?: string | null;

    @Expose()
    avatar_url?: string | null;

    @Expose()
    cover_url?: string | null;

    @Expose()
    country?: string | null;

    @Expose()
    created_at: Date;

    @Expose()
    @Transform(({ value, obj }) => {
        const source = value ?? obj.followers ?? 0;
        return Number(source) || 0;
    })
    followers_count: number;

    @Expose()
    @Transform(({ value, obj }) => {
        const source = value ?? obj.following ?? 0;
        return Number(source) || 0;
    })
    following_count: number;
}
