export class UserListItemDto {
    user_id: string;
    name: string;
    username: string;
    bio?: string;
    avatar_url?: string;
    cover_url?: string;
    verified: boolean;
    followers: number;
    following: number;
    is_following?: boolean;
    is_follower?: boolean;
    is_muted?: boolean;
    is_blocked?: boolean;
}
