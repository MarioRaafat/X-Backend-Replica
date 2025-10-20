import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-github2';
import { AuthService } from '../auth.service';
import { GitHubUserDto } from '../dto/github-user.dto';

@Injectable()
export class GitHubStrategy extends PassportStrategy(Strategy, 'github') {
    constructor(
        private config_service: ConfigService,
        private auth_service: AuthService
    ) {
        super({
            clientID: config_service.get('GITHUB_CLIENT_ID') || '',
            clientSecret: config_service.get('GITHUB_CLIENT_SECRET') || '',
            callbackURL: config_service.get('GITHUB_CALLBACK_URL') || '',
            scope: ['user:email'], // Request access to user's email
        });
    }

    async validate(
        access_token: string,
        refresh_token: string,
        profile: Profile,
        done?: any
    ): Promise<any> {
        const { id, username, displayName, emails, photos } = profile;

        // GitHub might not always return email in the profile (for now we must have email so I will throw an error if not)
        const email = emails && emails.length > 0 ? emails[0].value : null;

        if (!email) {
            throw new Error('No email found in GitHub profile');
        }

        // Split display name into first and last name
        const name_parts = displayName ? displayName.split(' ') : [username];
        const first_name = name_parts[0] || username || '';
        const last_name = name_parts.slice(1).join(' ') || '';

        const github_user: GitHubUserDto = {
            github_id: id,
            email: email,
            first_name: first_name,
            last_name: last_name,
            avatar_url: photos && photos.length > 0 ? photos[0].value : undefined,
        };

        try {
            const result = await this.auth_service.validateGitHubUser(github_user);

            // Type guard to check if result has user and needs_completion properties
            const user = 'user' in result ? result.user : result;
            const needs_completion = 'needs_completion' in result ? result.needs_completion : false;

            if (needs_completion) {
                return done(null, { needs_completion: true, user: user });
            }
            //user will be appended to the request
            return done(null, user);
        } catch (error) {
            console.log('GitHub strategy: Error during validation:', error.message);
            return done(error, null);
        }
    }
}
