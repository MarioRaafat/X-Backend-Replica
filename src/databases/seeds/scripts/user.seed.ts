import { BaseSeeder, ISeederContext } from './seeder.interface';
import { SeedHelper } from '../utils/seed-helper';
import { User } from 'src/user/entities/user.entity';

/**
 * User Seeder
 * Seeds users from Excel data into the database
 */
export class UserSeeder extends BaseSeeder {
    getName(): string {
        return 'UserSeeder';
    }

    async seed(context: ISeederContext): Promise<void> {
        const { data_source, topic_name, data } = context;

        this.log(`Seeding users for topic: ${topic_name}`);

        if (!data.users || data.users.length === 0) {
            this.logWarning('No users found, skipping...');
            return;
        }

        const unique_raw_users = SeedHelper.removeDuplicates(
            data.users,
            (row) => row.user_name // or row.email
        );

        this.log(`Found ${data.users.length} users, deduplicated to ${unique_raw_users.length}`);

        const user_repository = data_source.getRepository(User);

        // Transform raw data to User entities
        const users = await this.transformUsers(unique_raw_users, topic_name);

        this.log(`Transformed ${users.length} users`);

        // Insert in batches
        const inserted = await SeedHelper.insertBatch(user_repository, users);

        // Build Excel userId → database user.id map
        const id_map = new Map<string, string>();
        unique_raw_users.forEach((raw_user, index) => {
            const inserted_user = inserted[index];
            if (raw_user.userId && inserted_user?.id) {
                id_map.set(raw_user.userId.toString(), inserted_user.id);
            }
        });

        // Store results in context for next seeders
        if (!context.results) context.results = {};
        context.results.users = inserted;
        context.results.user_id_map = id_map;

        this.logSuccess(`Seeded ${inserted.length} users`);
    }

    /**
     * Transform raw Excel data to User entities
     */
    private async transformUsers(raw_data: any[], topic_name: string): Promise<User[]> {
        const hashed_password = await SeedHelper.hashPassword();

        return raw_data.map((row) => {
            // Parse dates
            const created_at = SeedHelper.parseDate(row.created_at) || new Date();

            // Parse counts
            const followers = SeedHelper.parseInt(row.followers, 0);
            const following = SeedHelper.parseInt(row.following, 0);

            return new User({
                email: SeedHelper.generateEmail(row.user_name, topic_name),
                password: hashed_password,
                name: row.name,
                username: row.user_name,
                bio: row.bio_description || null,
                phone_number: null,
                avatar_url: row.avatar_url || null,
                cover_url: row.cover_url || null,
                birth_date: SeedHelper.generateBirthDate(),
                language: 'en',
                verified: row.is_verified ?? false,
                country: row.location || null,
                online: false,
                created_at: created_at,
                updated_at: created_at,
                followers: followers,
                following: following,
            });
        });
    }
}
