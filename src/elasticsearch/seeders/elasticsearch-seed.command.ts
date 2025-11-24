import { Injectable } from '@nestjs/common';
import { Command, CommandRunner, Option } from 'nest-commander';
import { ElasticsearchSetupService } from '../elasticsearch-setup.service';
import { UserSeederService } from './user-seeder.service';

@Command({
    name: 'es:seed',
    description: 'Seed Elasticsearch with data from PostgreSQL',
})
@Injectable()
export class ElasticsearchSeedCommand extends CommandRunner {
    constructor(
        private readonly es_setup: ElasticsearchSetupService,
        private readonly user_seeder: UserSeederService
    ) {
        super();
    }

    async run(passed_params: string[], options?: Record<string, any>): Promise<void> {
        console.log('🚀 Starting Elasticsearch seeding...');

        try {
            console.log('📋 Setting up indices...');
            await this.es_setup.setupIndices();

            console.log('👥 Seeding users...');
            await this.user_seeder.seedUsers();

            // console.log('📝 Seeding posts...');
            // await this.postSeeder.seedPosts();

            console.log('✅ Seeding completed successfully!');
        } catch (error) {
            console.error('❌ Seeding failed:', error);
            throw error;
        }
    }
}
