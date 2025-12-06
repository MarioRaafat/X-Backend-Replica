export class FollowBackGroundNotificationJobDTO {
    follower_id: string;
    followed_id: string;

    action: 'add' | 'remove';

    follower_name?: string;
    follower_avatar_url?: string;
}
