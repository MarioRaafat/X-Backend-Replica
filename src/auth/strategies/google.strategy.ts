import { Inject, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import googleOauthConfig from '../authConfig/google-oauth.config';
import type { ConfigType } from '@nestjs/config';
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(googleOauthConfig.KEY)
    private googleConfiguration: ConfigType<typeof googleOauthConfig>,
  ) {
    if (
      !googleConfiguration.clientID ||
      !googleConfiguration.clientSecret ||
      !googleConfiguration.callbackURL
    ) {
      throw new Error('Google OAuth configuration is incomplete');
    }
    super({
      clientID: googleConfiguration.clientID,
      clientSecret: googleConfiguration.clientSecret,
      callbackURL: googleConfiguration.callbackURL,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accesToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ) {}
}
