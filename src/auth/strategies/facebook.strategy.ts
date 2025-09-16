import { Inject, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-facebook';
import type { ConfigType } from '@nestjs/config';
import { AuthService } from '../auth.service';
import facebookOauthConfig from '../authConfig/facebook-oauth.config';
import { FacebookLoginDTO } from '../dto/facebookLogin.dto';
@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(facebookOauthConfig.KEY)
    private facebookConfiguration: ConfigType<typeof facebookOauthConfig>,
    private authService: AuthService,
  ) {
    if (
      !facebookConfiguration.clientID ||
      !facebookConfiguration.clientSecret ||
      !facebookConfiguration.callbackURL
    ) {
      throw new Error('Facebook OAuth configuration is incomplete');
    }
    super({
      clientID: facebookConfiguration.clientID,
      clientSecret: facebookConfiguration.clientSecret,
      callbackURL: facebookConfiguration.callbackURL,
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
    const { id, username, displayName, emails } = profile;

    // GitHub might not always return email in the profile (for now we must have email so I will throw an error if not)
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
    };

    const user = await this.authService.validateFacebookUser(facebookUser);

    //user will be appended to the request
    done(null, user);
    return user;
  }
}
