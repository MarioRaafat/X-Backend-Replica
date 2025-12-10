import { Injectable, Logger } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { User } from 'src/user/entities';
import { ELASTICSEARCH_INDICES } from '../schemas';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class UserSeederService {
    private readonly logger = new Logger(UserSeederService.name);
    private readonly BATCH_SIZE = 1000;

    constructor(
        @InjectRepository(User)
        private user_repository: Repository<User>,
        private readonly elasticsearch_service: ElasticsearchService
    ) {}

    async seedUsers(): Promise<void> {
        this.logger.log('Starting user indexing...');

        const total_users = await this.user_repository.count();
        this.logger.log(`Total users to index: ${total_users}`);

        let offset = 0;
        let indexed = 0;

        while (offset < total_users) {
            const users = await this.user_repository.find({
                skip: offset,
                take: this.BATCH_SIZE,
            });

            if (users.length === 0) break;

            await this.bulkIndexUsers(users);

            indexed += users.length;
            offset += this.BATCH_SIZE;

            this.logger.log(`Indexed ${indexed}/${total_users} users`);
        }

        this.logger.log('User indexing completed');
    }

    private async bulkIndexUsers(users: User[]): Promise<void> {
        const operations = users.flatMap((user) => [
            { index: { _index: ELASTICSEARCH_INDICES.USERS, _id: user.id } },
            this.transformUserForES(user),
        ]);

        if (operations.length === 0) return;

        try {
            const result = await this.elasticsearch_service.bulk({
                refresh: false,
                operations,
            });

            if (result.errors) {
                this.logger.error('Bulk indexing had errors', result.items);
            }
        } catch (error) {
            this.logger.error('Failed to bulk index users', error);
            throw error;
        }
    }

    private transformUserForES(user: User) {
        return {
            user_id: user.id,
            username: user.username,
            name: user.name,
            followers: user.followers,
            following: user.following,
            verified: user.verified,
            bio: user.bio,
            avatar_url: user.avatar_url,
        };
    }
}
