import { Exclude } from 'class-transformer';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  email: string;

  @Column({ type: 'varchar', nullable: true })
  @Exclude()
  password: string;

  @Column({ type: 'varchar' })
  firstName: string;

  @Column({ type: 'varchar' })
  lastName: string;

  @Column({ type: 'varchar' })
  phoneNumber: string;

  @Column({ type: 'varchar', nullable: true })
  githubId?: string;

  @Column({ type: 'varchar', nullable: true })
  facebookId?: string;

  @Column({ type: 'varchar', nullable: true })
  googleId?: string;

  @Column({ type: 'varchar', nullable: true })
  avatarUrl?: string;

  constructor(user: Partial<User>) {
    Object.assign(this, user);
  }
}
