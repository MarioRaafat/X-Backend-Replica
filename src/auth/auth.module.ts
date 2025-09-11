import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/user/entities/user.entity';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UserModule } from 'src/user/user.module';
import { UserService } from 'src/user/user.service';
import { RedisModule } from '@nestjs-modules/ioredis';
import { RedisService } from 'src/redis/redis.service';
import { VerificationModule } from 'src/verification/verification.module';
import { MessageModule } from 'src/message/message.module';
import { EmailService } from 'src/message/email.service';
import { VerificationService } from 'src/verification/verification.service';
import googleOauthConfig from './authConfig/google-oauth.config';
import { GoogleStrategy } from './strategies/google.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_TOKEN_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_TOKEN_EXPIRATION_TIME'),
        },
      }),
      inject: [ConfigService],
    }),
    PassportModule,
    UserModule,
    RedisModule,
    VerificationModule,
    MessageModule,
    //google oauth
    ConfigModule.forFeature(googleOauthConfig),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    UserService,
    RedisService,
    VerificationService,
    EmailService,
    GoogleStrategy,
  ],
})
export class AuthModule {}
