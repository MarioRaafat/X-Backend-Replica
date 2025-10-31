import { BaseSeeder, ISeederContext } from './seeder.interface';
import { SeedHelper } from '../utils/seed-helper';
import { UserFollows } from 'src/user/entities/user-follows.entity';

export class UserFollowsSeeder extends BaseSeeder {
    getName(): string {
        return 'UserFollowsSeeder';
    }

    async seed(context: ISeederContext): Promise<void> {
        const { data_source, topic_name, data, results } = context;

        this.log(`Seeding user follows for topic: ${topic_name}`);

        if (!data.users || data.users.length === 0) {
            this.logWarning('No users found, skipping...');
            return;
        }

        const user_id_map = results?.user_id_map;
        const inserted_users = results?.users;

        if (!user_id_map?.size || !inserted_users?.length) {
            this.logWarning('No user ID map available, skipping follows...');
            return;
        }

        const follows_repo = data_source.getRepository(UserFollows);

        // Get all database user IDs
        const all_user_ids = Array.from(user_id_map.values());
        const total_users = all_user_ids.length;

        this.log(`Total users in database: ${total_users}`);

        // Process users in batches to avoid memory issues
        const BATCH_SIZE = 100;
        const follow_set = new Set<string>(); // Track all relationships
        let total_inserted = 0;

        for (let i = 0; i < data.users.length; i += BATCH_SIZE) {
            const batch = data.users.slice(i, Math.min(i + BATCH_SIZE, data.users.length));
            const follow_relations: UserFollows[] = [];

            for (const raw_user of batch) {
                const user_id = user_id_map.get(String(raw_user.userId));

                if (!user_id) continue;

                // Parse follower and following counts
                let followers_count = SeedHelper.parseInt(raw_user.followers, 0);
                let following_count = SeedHelper.parseInt(raw_user.following, 0);

                // Apply the rule: if count > total_users, set to half of total_users
                // Also cap at reasonable maximum to prevent memory issues
                const max_per_user = Math.min(Math.floor(total_users / 2), 500);

                if (followers_count > total_users) {
                    followers_count = max_per_user;
                } else {
                    followers_count = Math.min(followers_count, max_per_user);
                }

                if (following_count > total_users) {
                    following_count = max_per_user;
                } else {
                    following_count = Math.min(following_count, max_per_user);
                }

                // Generate followers (other users following this user)
                const followers = this.getRandomUsers(all_user_ids, user_id, followers_count);

                for (const follower_id of followers) {
                    const key = `${follower_id}:${user_id}`;
                    if (!follow_set.has(key)) {
                        const relation = new UserFollows();
                        relation.follower_id = follower_id;
                        relation.followed_id = user_id;
                        follow_relations.push(relation);
                        follow_set.add(key);
                    }
                }

                // Generate following (this user following other users)
                const following = this.getRandomUsers(all_user_ids, user_id, following_count);

                for (const followed_id of following) {
                    const key = `${user_id}:${followed_id}`;
                    if (!follow_set.has(key)) {
                        const relation = new UserFollows();
                        relation.follower_id = user_id;
                        relation.followed_id = followed_id;
                        follow_relations.push(relation);
                        follow_set.add(key);
                    }
                }
            }

            // Insert this batch
            if (follow_relations.length > 0) {
                await SeedHelper.insertBatch(follows_repo, follow_relations);
                total_inserted += follow_relations.length;
                this.log(
                    `Processed users ${i + 1}-${Math.min(i + BATCH_SIZE, data.users.length)}: inserted ${follow_relations.length} relationships (total: ${total_inserted})`
                );
            }

            // Clear memory
            follow_relations.length = 0;
        }

        this.logSuccess(`Seeded ${total_inserted} user follows`);
    }

    /**
     * Get random users excluding the current user
     */
    private getRandomUsers(
        all_user_ids: string[],
        exclude_user_id: string,
        count: number
    ): string[] {
        // Filter out the current user
        const available_users = all_user_ids.filter((id) => id !== exclude_user_id);

        if (available_users.length === 0 || count === 0) {
            return [];
        }

        // Don't try to get more users than available
        const actual_count = Math.min(count, available_users.length);

        // Shuffle and take the first 'actual_count' users
        const shuffled = [...available_users].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, actual_count);
    }
}
