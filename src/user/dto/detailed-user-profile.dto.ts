import { UserProfileDto } from './user-profile.dto';
import { MutualFollowerDto } from './mutual-follower.dto';

export class DetailedUserProfileDto extends UserProfileDto {
  is_follower: boolean = false;
  is_following: boolean = false;
  is_muted: boolean = false;
  is_blocked: boolean = false;
  top_mutual_followers: MutualFollowerDto[] = [];
  mutual_followers_count: number = 0;
}
