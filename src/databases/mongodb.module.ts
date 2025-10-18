import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
    imports: [
        MongooseModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: async (config: ConfigService) => {
                const uri = config.get<string>('MONGODB_URI');
                return { uri };
            },
        }),
    ],
})
export class MongodbModule {
    constructor() {}
}
