import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-github2';
import { AuthService } from '../auth.service';
import { GitHubUserDto } from '../dto/github-user.dto';

@Injectable()
export class GitHubStrategy extends PassportStrategy(Strategy, 'github') {
    constructor(
        private config_service: ConfigService,
        private auth_service: AuthService,
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
    ): Promise<any> {
        console.log('GitHub Profile:', JSON.stringify(profile, null, 2));

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

        const user = await this.auth_service.validateGitHubUser(github_user);

        return user;
    }
}
