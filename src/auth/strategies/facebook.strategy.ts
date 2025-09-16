import { Inject, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-facebook';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { FacebookLoginDTO } from '../dto/facebookLogin.dto';
@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      clientID: configService.get('FACEBOOK_CLIENT_ID') || ' ',
      clientSecret: configService.get('FACEBOOK_SECRET') || '',
      callbackURL: configService.get('FACEBOOK_CALLBACK_URL') || '',
      scope: ['email', 'public_profile'],
      profileFields: ['id', 'emails', 'displayName'], // to get user email
    });
  }

  async validate(
    accesToken: string,
    refreshToken: string,
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
    const nameParts = displayName ? displayName.split(' ') : [username];
    const firstName = nameParts[0] || username || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    console.log(firstName, lastName);

    const facebookUser: FacebookLoginDTO = {
      facebookId: id,
      email: email,
      firstName: firstName,
      lastName: lastName,
      avatarUrl: profileUrl,
    };

    const user = await this.authService.validateFacebookUser(facebookUser);

    //user will be appended to the request
    done(null, user);
  }
}
