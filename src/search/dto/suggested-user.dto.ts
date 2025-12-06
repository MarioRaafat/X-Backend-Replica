import { Expose } from 'class-transformer';

export class SuggestedUserDto {
    @Expose()
    user_id: string;
    @Expose()
    username: string;
    @Expose()
    name: string;
    @Expose()
    avatar_url: string;
    @Expose()
    is_following: boolean;
    @Expose()
    is_follower: boolean;
}
