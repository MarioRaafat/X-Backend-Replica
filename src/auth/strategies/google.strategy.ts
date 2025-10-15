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
        const first_name = name?.givenName;
        const last_name = name?.familyName || '';
        
        try {
            const result = await this.auth_service.validateGoogleUser({
                google_id: id,
                email: emails[0].value,
                first_name: first_name,
                last_name: last_name,
                avatar_url: avatar_url,
            });

            // Type guard to check if result has user and needs_completion properties
            const user = 'user' in result ? result.user : result;
            const needs_completion = 'needs_completion' in result ? result.needs_completion : false;

            if (needs_completion) {
                console.log('Google strategy: OAuth completion required');
                return done(null, {needs_completion: true, user: user});
            }

            console.log('Google strategy: User found, authentication successful');
            //user will be appended to the request
            return done(null, user);
        } catch (error) {
            console.log('Google strategy: Error during validation:', error.message);
            return done(error, null);
        }
    }
}
