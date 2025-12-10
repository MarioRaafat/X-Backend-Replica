import { Module } from '@nestjs/common';
import { BaseGateway } from './gateway';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NotificationsModule } from '../notifications/notifications.module';
import { MessagesModule } from '../messages/messages.module';

@Module({
    imports: [
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config_service: ConfigService) => ({
                secret: config_service.get('JWT_TOKEN_SECRET'),
                signOptions: { expiresIn: config_service.get('JWT_TOKEN_EXPIRES_IN') },
            }),
        }),
        NotificationsModule,
        MessagesModule,
    ],
    providers: [BaseGateway],
    exports: [BaseGateway],
})
export class GatewayModule {}
