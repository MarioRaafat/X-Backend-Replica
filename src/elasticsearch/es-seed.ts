import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UserSeederService } from './seeders/user-seeder.service';
import { ElasticsearchSetupService } from './elasticsearch-setup.service';

async function bootstrap() {
    console.log('🚀 Starting Elasticsearch seeding...');

    const app = await NestFactory.createApplicationContext(AppModule, {
        logger: ['error', 'warn', 'log'],
    });

    try {
        const es_setup = app.get(ElasticsearchSetupService);
        const user_seeder = app.get(UserSeederService);

        console.log('📋 Setting up indices...');
        await es_setup.setupIndices();

        console.log('👥 Seeding users...');
        await user_seeder.seedUsers();

        console.log('✅ Seeding completed successfully!');
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        console.error(error);
        process.exit(1);
    } finally {
        await app.close();
    }
}

bootstrap();
