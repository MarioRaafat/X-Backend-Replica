import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
  InternalServerErrorException,
} from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { User } from 'src/user/entities/user.entity';
import { EntityManager } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { UserService } from 'src/user/user.service';
import { LoginDTO } from './dto/login.dto';
import { RedisService } from 'src/redis/redis.service';
import { VerificationService } from 'src/verification/verification.service';
import { EmailService } from 'src/message/email.service';
import { GitHubUserDto } from './dto/github-user.dto';
import { CaptchaService } from './captcha.service';
import * as crypto from 'crypto';
import { GoogleLoginDTO } from './dto/googleLogin.dto';
import { FacebookLoginDTO } from './dto/facebookLogin.dto';
import { ConfigService } from '@nestjs/config';
import { getVerificationEmailTemplate } from 'src/templates/email-verification';
import { getPasswordResetEmailTemplate } from 'src/templates/password-reset';
import { API_URL } from 'src/common/constants';
import { instanceToPlain } from 'class-transformer';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly redisService: RedisService,
    private readonly verificationService: VerificationService,
    private readonly emailService: EmailService,
    private readonly captchaService: CaptchaService,
    private readonly configService: ConfigService,
  ) {}

  async generateTokens(id: string) {
    const accessToken = this.jwtService.sign(
      { id },
      {
        secret: process.env.JWT_TOKEN_SECRET,
        expiresIn: process.env.JWT_TOKEN_EXPIRATION_TIME,
      },
    );

    const refreshPayload = { id, jti: crypto.randomUUID() };
    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: process.env.JWT_REFRESH_EXPIRATION_TIME,
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  async register(registerDto: RegisterDto) {
    const { email, confirm_password, password, captcha_token, ...registerUser } =
      registerDto;

    // Verify CAPTCHA first (comment that in case you want to test the endpoint)
    try {
      await this.captchaService.validateCaptcha(captcha_token);
    } catch (error) {
      throw new BadRequestException(
        'CAPTCHA verification failed. Please try again.',
      );
    }

    // Check if email is under verification process
    const pendingUser = await this.redisService.hget(`user:${email}`);

    if (pendingUser) {
      throw new ConflictException('Email already exists');
    }

    // Check if email is in use
    const existingUser = await this.userService.findUserByEmail(
      registerDto.email,
    );

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Check that passwords match
    if (password !== confirm_password) {
      throw new BadRequestException(
        'Confirmation password must match password',
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await this.redisService.hset(
      `user:${email}`,
      {
        ...registerUser,
        password: hashedPassword,
      },
      this.configService.get('PENDING_USER_EXPIRATION_TIME') || 3600,
    );

    // Send verification email
    await this.generateEmailVerification(email);
    return {
      isEmailSent: true,
    };
  }

  async generateEmailVerification(email: string) {
    const user = await this.redisService.hget(`user:${email}`);

    if (!user) {
      throw new NotFoundException('User not found or already verified');
    }

    const otp = await this.verificationService.generateOtp(email, 'email');

    const notMeLink = await this.verificationService.generateNotMeLink(
      email,
      `${API_URL}/auth/not-me`,
    );

        const html = getVerificationEmailTemplate({
            first_name: user.firstName,
            otp,
            not_me_link: notMeLink,
        });    const emailSent = await this.emailService.sendEmail({
      subject: 'El Sab3 - Account Verification',
      recipients: [{ name: user.firstName ?? '', address: email }],
      html,
    });

    if (!emailSent) {
      throw new InternalServerErrorException('Failed to send OTP email');
    }

    return { isEmailSent: true };
  }

  async sendResetPasswordEmail(userId: string) {
    const user = await this.userService.findUserById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    const otp = await this.verificationService.generateOtp(userId, 'password');
    const email = user.email;
    const userName = email.split('@')[0]; // just for now
    
        const html = getPasswordResetEmailTemplate({
            otp: otp,
            user_name: userName || 'Mario0o0o',
        });    const emailSent = await this.emailService.sendEmail({
      subject: 'Password reset request',
      recipients: [{ name: user.first_name ?? '', address: email }],
      html,
    });

    if (!emailSent) {
      throw new InternalServerErrorException('Failed to send password reset email');
    }

    return { isEmailSent: true };
  }

  async verifyEmail(email: string, token: string) {
    const user = await this.redisService.hget(`user:${email}`);
    if (!user) {
      throw new NotFoundException('User not found or already verified');
    }

    const isValid = await this.verificationService.validateOtp(
      email,
      token,
      'email',
    );

    if (!isValid) {
      throw new UnprocessableEntityException('Expired or incorrect token');
    }

    const first_name = user.firstName;
    const last_name = user.lastName;

    const createdUser = await this.userService.createUser({
      email,
      first_name,
      last_name,
      ...user,
    });

    if (!createdUser) {
      throw new InternalServerErrorException('Failed to save user to database');
    }

    await this.redisService.del(`user:${email}`);

    return {
      userId: createdUser.id,
    };
  }

  async verifyResetPasswordOtp(userId: string, token: string) {
    const isValid = await this.verificationService.validateOtp(
      userId,
      token,
      'password',
    );

    if (!isValid) {
      throw new UnprocessableEntityException('Expired or incorrect token');
    }

    // Generate secure token for password reset step
    const resetToken = await this.verificationService.generatePasswordResetToken(userId);

    return { 
      isValid: true,
      resetToken // This token will be used in step 3
    };
  }

  async resetPassword(userId: string, newPassword: string, token: string) {
    const tokenData = await this.verificationService.validatePasswordResetToken(token);
    
    if (!tokenData) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }
    // check that the 2 ids are same
    if (tokenData.userId !== userId) {
      throw new UnauthorizedException('Invalid reset token for this user');
    }

    const user = await this.userService.findUserById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // check if new password is same as old password
    if (user.password) {
      const isSamePassword = await bcrypt.compare(newPassword, user.password);
      if (isSamePassword) {
        throw new BadRequestException('New password must be different from the current password');
      }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.userService.updateUserPassword(userId, hashedPassword);
    return { success: true };
  }

  async handleNotMe(token: string) {
    const user = await this.verificationService.validateNotMeLink(token);

    if (!user) {
      throw new UnauthorizedException('Invalid or expired link');
    }

    const pendingUser = await this.redisService.hget(`user:${user.email}`);

    if (!pendingUser) {
      throw new BadRequestException('Account was already verified');
    }

    await this.redisService.del(`user:${user.email}`);
    await this.redisService.del(`otp:email:${user.email}`);

    return { message: 'deleted account successfully' };
  }

  async validateUser(email: string, password: string): Promise<string> {
    const user = await this.userService.findUserByEmail(email);
    if (!user) {
      const unverifiedUser = await this.redisService.hget(`user:${email}`);
      if (!unverifiedUser) {
        throw new NotFoundException('User not found');
      } else {
        const isPasswordValid = await bcrypt.compare(password, unverifiedUser.password);
        if (!isPasswordValid) {
          throw new UnauthorizedException('Wrong password');
        } else {
          throw new UnauthorizedException('Email not verified yet. Please check your inbox.');
        }
      }
    }

    if (user.password) {
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid)
        throw new UnauthorizedException('Wrong password');
    } else {
      throw new UnauthorizedException('User registered with social login. Please use social login to access your account.');
    }

    return user.id;
  }

  async login(loginDTO: LoginDTO) {
    const id = await this.validateUser(loginDTO.email, loginDTO.password);

    const userInstance = await this.userService.findUserById(id);
    const user = instanceToPlain(userInstance);

    const { access_token, refresh_token } = await this.generateTokens(id);

    return { user, access_token, refresh_token };
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    if (newPassword === oldPassword) {
      throw new BadRequestException(
        'New password must be different from the old password',
      );
    }

    const user = await this.userService.findUserById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // for now, I will ignore users without password (OAuth users)
    if (user.password) {
      const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Wrong password');
      }
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await this.userService.updateUserPassword(userId, hashedNewPassword);

    return {
      success: true,
    }
  }

  async refresh(token: string) {
    try {
      const payload: any = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_REFRESH_SECRET,
      });

      const revoked = await this.redisService.get(
        `revoked_refresh:${payload.jti}`,
      );
      if (revoked) {
        throw new UnauthorizedException('Refresh token has been revoked');
      }

      const newAccessToken = this.jwtService.sign(
        { id: payload.id },
        {
          secret: process.env.JWT_TOKEN_SECRET,
          expiresIn: process.env.JWT_TOKEN_EXPIRATION_TIME,
        },
      );

      const newRefreshPayload = { id: payload.id, jti: crypto.randomUUID() };
      const newRefreshToken = this.jwtService.sign(newRefreshPayload, {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: process.env.JWT_REFRESH_EXPIRATION_TIME,
      });

      const expiresIn = payload.exp - Math.floor(Date.now() / 1000);
      await this.redisService.set(
        `revoked_refresh:${payload.jti}`,
        'revoked',
        expiresIn,
      );

      return {
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
      };
    } catch (e) {
      console.log(e);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async validateGoogleUser(google_user: GoogleLoginDTO) {
    let user = await this.userService.findUserByGoogleId(google_user.google_id);

    if (user) return user;

    if (google_user.email) {
      user = await this.userService.findUserByEmail(google_user.email);
      if (user) {
        const updatedUser = await this.userService.updateUser(user.id, {
          google_id: google_user.google_id,
          avatar_url: google_user.avatar_url,
        });

        if (!updatedUser) {
          throw new InternalServerErrorException('Failed to update user');
        }

        return updatedUser;
      }
    }

    return await this.userService.createUser({
      email: google_user.email,
      first_name: google_user.first_name,
      last_name: google_user.last_name,
      avatar_url: google_user.avatar_url,
      google_id: google_user.google_id,
      password: '',
      phone_number: '',
    });
  }

  async validateFacebookUser(facebook_user: FacebookLoginDTO) {
    let user = await this.userService.findUserByFacebookId(
      facebook_user.facebook_id,
    );

    //user has already signed in with facebook
    if (user) {
      return user;
    }

    //user has already signed in with this email, so it is the same record in db
    if (facebook_user.email) {
      user = await this.userService.findUserByEmail(facebook_user.email);
      if (user) {
        const updatedUser = await this.userService.updateUser(user.id, {
          facebook_id: facebook_user.facebook_id,
          avatar_url: facebook_user.avatar_url,
        });

        if (!updatedUser) {
          throw new InternalServerErrorException('Failed to update user');
        }

        return updatedUser;
      }
    }

    return await this.userService.createUser({
      email: facebook_user.email,
      first_name: facebook_user.first_name,
      last_name: facebook_user.last_name,
      facebook_id: facebook_user.facebook_id,
      avatar_url: facebook_user.avatar_url,
      phone_number: '',
      password: '', // No password for OAuth users
    });
  }

  /* 
      ######################### GitHub OAuth Routes #########################
  */
  async validateGitHubUser(github_user: GitHubUserDto): Promise<User> {
    let user = await this.userService.findUserByGithubId(github_user.github_id);
    if (user) {
      return user;
    }

    user = await this.userService.findUserByEmail(github_user.email);
    if (user) {
      const updatedUser = await this.userService.updateUser(user.id, {
        github_id: github_user.github_id,
        avatar_url: github_user.avatar_url,
      });

      if (!updatedUser) {
        throw new InternalServerErrorException('Failed to update user');
      }

      return updatedUser;
    }

    return await this.userService.createUser({
      email: github_user.email,
      first_name: github_user.first_name,
      last_name: github_user.last_name,
      github_id: github_user.github_id,
      avatar_url: github_user.avatar_url,
      phone_number: '', // Will be filled later if needed
      password: undefined, // No password for OAuth users
    });
  }
}
