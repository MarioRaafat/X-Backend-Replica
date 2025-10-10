import { Inject, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy) {
    constructor(
        private config_service: ConfigService,
        private auth_service: AuthService,
    ) {
        super({
            clientID: config_service.get('GOOGLE_CLIENT_ID') || '',
            clientSecret: config_service.get('GOOGLE_SECRET') || '',
            callbackURL: config_service.get('GOOGLE_CALLBACK_URL'),
            scope: ['email', 'profile'],
        });
    }

    async validate(
        access_token: string,
        refresh_token: string,
        profile: any,
        done: VerifyCallback,
    ) {
        const { id, name, emails, photos } = profile;

        const avatar_url = photos && photos.length > 0 ? photos[0].value : undefined;
        const user = await this.auth_service.validateGoogleUser({
            google_id: id,
            email: emails[0].value,
            first_name: name.givenName,
            last_name: name.familyName,
            avatar_url: avatar_url,
        });

        //user will be appended to the request
        return user;
    }
}
