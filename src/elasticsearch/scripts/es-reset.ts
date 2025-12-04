import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { ElasticsearchSetupService } from '../elasticsearch-setup.service';

async function bootstrap() {
    console.log('🔁 Starting Elasticsearch index reset...');

    const app = await NestFactory.createApplicationContext(AppModule, {
        logger: ['error', 'warn', 'log'],
    });

    try {
        const es_setup = app.get(ElasticsearchSetupService);

        console.log('🗑️ Deleting all indices...');
        await es_setup.resetIndices();

        console.log('🚀 All indices reset and recreated successfully!');
    } catch (error) {
        console.error('❌ Reset failed:', error);
        process.exit(1);
    } finally {
        await app.close();
        process.exit(0);
    }
}

bootstrap();
