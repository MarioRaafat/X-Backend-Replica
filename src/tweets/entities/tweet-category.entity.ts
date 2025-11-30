import { Category } from '../../category/entities/category.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Tweet } from './tweet.entity';

@Entity('tweet_categories')
@Index('IDX_CATEGORY', ['category_id'])
export class TweetCategory {
    @PrimaryColumn({ type: 'uuid' })
    tweet_id: string;
    @PrimaryColumn({ type: 'smallint' })
    category_id: number;

    @Column({ type: 'int', default: 0 })
    percentage: number;

    @ManyToOne(() => Category, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'category_id' })
    category: Category;

    @ManyToOne(() => Tweet, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'tweet_id' })
    tweet: Tweet;
}
