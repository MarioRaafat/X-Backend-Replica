import { Inject, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-facebook';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { FacebookLoginDTO } from '../dto/facebook-login.dto';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy) {
    constructor(
        private config_service: ConfigService,
        private auth_service: AuthService,
    ) {
        super({
            clientID: config_service.get('FACEBOOK_CLIENT_ID') || '',
            clientSecret: config_service.get('FACEBOOK_SECRET') || '',
            callbackURL: config_service.get('FACEBOOK_CALLBACK_URL') || '',
            scope: ['email', 'public_profile'],
            profileFields: ['id', 'emails', 'displayName'], // to get user email
        });
    }

    async validate(
        access_token: string,
        refresh_token: string,
        profile: any,
        done: any,
    ) {
        try {
            console.log('Facebook Profile:', JSON.stringify(profile, null, 2));
            const { id, username, displayName, emails, photos } = profile;

            // Facebook might not always provide email
            const email = emails && emails.length > 0 ? emails[0].value : null;
            if (!email) {
                console.error('No email found in Facebook profile');
                return done(new Error('No email found in Facebook profile'), null);
            }

            // Split display name into first and last name
            const name_parts = displayName ? displayName.split(' ') : [username || 'User'];
            const first_name = name_parts[0] || username || 'User';
            const last_name = name_parts.slice(1).join(' ') || '';

            console.log('Parsed names:', { first_name, last_name });

            const facebook_user: FacebookLoginDTO = {
                facebook_id: id,
                email: email,
                first_name: first_name,
                last_name: last_name,
                avatar_url: photos && photos.length > 0 ? photos[0].value : undefined,
            };

            const result = await this.auth_service.validateFacebookUser(facebook_user);

            // Type guard to check if result has user and needs_completion properties
            const user = 'user' in result ? result.user : result;
            const needs_completion = 'needs_completion' in result ? result.needs_completion : false;

            if (needs_completion) {
                return done(null, {needs_completion: true, user: user});
            }

            //user will be appended to the request
            return done(null, user);
        } catch (error) {
            console.log('Facebook strategy: Error during validation:', error.message);
            return done(error, null);
        }
    }
}
