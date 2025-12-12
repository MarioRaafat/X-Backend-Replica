import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { ElasticsearchSetupService } from '../elasticsearch-setup.service';
import { TweetSeederService } from '../seeders/tweets-seeder.service';

async function bootstrap() {
    console.log('🚀 Starting Elasticsearch seeding...');

    const app = await NestFactory.createApplicationContext(AppModule, {
        logger: ['error', 'warn', 'log'],
    });

    try {
        const es_setup = app.get(ElasticsearchSetupService);
        const tweets_seeder = app.get(TweetSeederService);

        console.log('📋 Setting up indices...');
        await es_setup.setupIndices();

        console.log('📝 Seeding tweets...');
        await tweets_seeder.seedTweets();

        console.log('✅ Seeding completed successfully!');
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        console.error(error);
        process.exit(1);
    } finally {
        await app.close();
        process.exit(0);
    }
}

bootstrap();
