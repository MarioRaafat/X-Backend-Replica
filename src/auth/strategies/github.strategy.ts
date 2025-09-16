import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-github2';
import { AuthService } from '../auth.service';
import { GitHubUserDto } from '../dto/github-user.dto';

@Injectable()
export class GitHubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      clientID: configService.get('GITHUB_CLIENT_ID') || '',
      clientSecret: configService.get('GITHUB_CLIENT_SECRET') || '',
      callbackURL: configService.get('GITHUB_CALLBACK_URL') || '',
      scope: ['user:email'], // Request access to user's email
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
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
    const nameParts = displayName ? displayName.split(' ') : [username];
    const firstName = nameParts[0] || username || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const githubUser: GitHubUserDto = {
      githubId: id,
      email: email,
      firstName: firstName,
      lastName: lastName,
      avatarUrl: photos && photos.length > 0 ? photos[0].value : undefined,
    };

    const user = await this.authService.findOrCreateGitHubUser(githubUser);

    return user;
  }
}
