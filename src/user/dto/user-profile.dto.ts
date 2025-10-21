import { Transform } from 'class-transformer';

export class UserProfileDto {
  user_id: string;
  name: string;
  username: string;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  country: string;
  created_at: Date;

  @Transform(({ value }) => Number(value) || 0)
  followers_count: number;

  @Transform(({ value }) => Number(value) || 0)
  following_count: number;
}
