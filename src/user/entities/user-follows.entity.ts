import { Entity, PrimaryColumn, ManyToMany, JoinColumn } from 'typeorm';
import { User } from 'src/user/entities/user.entity';

@Entity('user_follows')
export class UserFollows {
  @PrimaryColumn({ type: 'uuid' })
  follower_id: string;

  @PrimaryColumn({ type: 'uuid' })
  followed_id: string;

  @ManyToMany(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'follower_id' })
  follower: User;

  @ManyToMany(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'followed_id' })
  followed: User;
}
