import { Inject, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-facebook';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { FacebookLoginDTO } from '../dto/facebookLogin.dto';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy) {
    constructor(
        private config_service: ConfigService,
        private auth_service: AuthService,
    ) {
        super({
            clientID: config_service.get('FACEBOOK_CLIENT_ID') || ' ',
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
        console.log(profile);
        const { id, username, displayName, emails, profileUrl } = profile;

        // Facebook usually will not provide us with the user email (to be discussed)
        const email = emails && emails.length > 0 ? emails[0].value : null;
        if (!email) {
            throw new Error('No email found in Facebook profile');
        }

        // Split display name into first and last name
        const name_parts = displayName ? displayName.split(' ') : [username];
        const first_name = name_parts[0] || username || '';
        const last_name = name_parts.slice(1).join(' ') || '';

        console.log(first_name, last_name);

        const facebook_user: FacebookLoginDTO = {
            facebook_id: id,
            email: email,
            first_name: first_name,
            last_name: last_name,
            avatar_url: profileUrl,
        };

        const user = await this.auth_service.validateFacebookUser(facebook_user);

        //user will be appended to the request
        done(null, user);
    }
}
