import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Category } from '../../category/entities';

@Entity('user_interests')
export class UserInterests {
    @PrimaryColumn({ type: 'uuid' })
    user_id: string;

    @PrimaryColumn({ type: 'smallint' })
    category_id: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @ManyToOne(() => Category, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'category_id' })
    category: Category;

    @Column({ type: 'int', default: 50 })
    score: number;
}
