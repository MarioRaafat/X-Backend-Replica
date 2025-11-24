import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/user/entities/user.entity';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GitHubStrategy } from './strategies/github.strategy';
import { CaptchaService } from './captcha.service';
import { UsernameService } from './username.service';
import { UserModule } from 'src/user/user.module';
import { RedisModule } from '@nestjs-modules/ioredis';
import { RedisService } from 'src/redis/redis.service';
import { VerificationModule } from 'src/verification/verification.module';
import { CommunicationModule } from 'src/communication/communication.module';
import { EmailService } from 'src/communication/email.service';
import { VerificationService } from 'src/verification/verification.service';
import { GoogleStrategy } from './strategies/google.strategy';
import { FacebookStrategy } from './strategies/facebook.strategy';
import { UserRepository } from 'src/user/user.repository';
import { BackgroundJobsModule } from 'src/background-jobs/background-jobs.module';
import { PaginationService } from 'src/shared/services/pagination/pagination.service';
import { EmailJobsService } from 'src/background-jobs/email/email.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([User]),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (config_service: ConfigService) => ({
                secret: config_service.get('JWT_TOKEN_SECRET'),
                signOptions: {
                    expiresIn: config_service.get('JWT_TOKEN_EXPIRATION_TIME'),
                },
            }),
            inject: [ConfigService],
        }),
        PassportModule,
        UserModule,
        RedisModule,
        VerificationModule,
        CommunicationModule,
        BackgroundJobsModule,
    ],
    controllers: [AuthController],
    providers: [
        AuthService,
        JwtStrategy,
        GitHubStrategy,
        UserRepository,
        RedisService,
        VerificationService,
        EmailService,
        EmailJobsService,
        CaptchaService,
        UsernameService,
        GoogleStrategy,
        FacebookStrategy,
        PaginationService,
    ],
})
export class AuthModule {}
