import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  email: string;

  @Column({ type: 'varchar', nullable: true })
  password: string;

  @Column({ type: 'varchar' })
  firstName: string;

  @Column({ type: 'varchar' })
  lastName: string;

  @Column({ type: 'varchar' }) // why not unique?
  phoneNumber: string;

  @Column({ type: 'bool', default: false })
  verified: boolean;

  @Column({ type: 'varchar', nullable: true })
  githubId?: string;

  @Column({ type: 'varchar', default: 'local' })
  provider: string; // 'local' | 'github'

  @Column({ type: 'varchar', nullable: true })
  avatarUrl?: string;

  constructor(user: Partial<User>) {
    Object.assign(this, user);
  }
}
