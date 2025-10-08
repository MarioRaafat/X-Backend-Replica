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
import { Response } from 'express';
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

    const ttl = 7 * 24 * 60 * 60; 

    await this.redisService.set(
      `refresh:${refreshPayload.jti}`,
      JSON.stringify({ id }),
      7 * 24 * 60 * 60,
    );

    await this.redisService.sadd(`user:${id}:refreshTokens`, refreshPayload.jti);
    await this.redisService.expire(`user:${id}:refreshTokens`, ttl);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }


  async logout(refreshToken: string, res: Response) {
    try {
      const payload: any = await this.jwtService.verifyAsync(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });

      await this.redisService.del(`refresh:${payload.jti}`);
      await this.redisService.srem(`user:${payload.id}:refreshTokens`, payload.jti);

      res.clearCookie('refresh_token', {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
      });

      return { message: 'Logged out successfully' };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logoutAll(refreshToken: string, res: Response) {
    try {
      const payload: any = await this.jwtService.verifyAsync(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });

      const tokens = await this.redisService.smembers(`user:${payload.id}:refreshTokens`);

      if (tokens.length > 0) {
        const pipeline = this.redisService.pipeline();
        tokens.forEach(jti => pipeline.del(`refresh:${jti}`));
        pipeline.del(`user:${payload.id}:refreshTokens`);
        await pipeline.exec();
      }

      res.clearCookie('refresh_token', {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
      });

      return { message: 'Logged out from all devices' };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async register(registerDto: RegisterDto) {
    const { email, confirmPassword, password, captchaToken, ...registerUser } =
      registerDto;

    // Verify CAPTCHA first (comment that in case you want to test the endpoint)
    try {
      await this.captchaService.validateCaptcha(captchaToken);
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
    if (password !== confirmPassword) {
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
      otp,
    });

    const emailSent = await this.emailService.sendEmail({
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
      userName: userName || 'Mario0o0o',
    });

    const emailSent = await this.emailService.sendEmail({
      subject: 'Password reset request',
      recipients: [{ name: user.firstName ?? '', address: email }],
      html,
    });

    if (!emailSent) {
      throw new InternalServerErrorException(
        'Failed to send password reset email',
      );
    }

    return { isEmailSent: true };
  }

  async verifyEmail(email: string, token: string) {
    let user: any;
    try {
      user = await this.redisService.hget(`user:${email}`);
    } catch (error) {
      throw new InternalServerErrorException('Failed to retrieve user data');
    }
    if (!user) {
      throw new NotFoundException('User not found or already verified');
    }

    let isValid: boolean;
    try {
      isValid = await this.verificationService.validateOtp(
        email,
        token,
        'email',
      );
    } catch (error) {
      throw new InternalServerErrorException('Failed to validate OTP');
    }

    if (!isValid) {
      throw new UnprocessableEntityException('Expired or incorrect token');
    }

    const firstName = user.firstName;
    const lastName = user.lastName;

    let createdUser: User;
    try {
      createdUser = await this.userService.createUser({
        email,
        firstName,
        lastName,
        ...user,
      });
    } catch (error) {
      throw new InternalServerErrorException('Failed to save user to database');
    }

    if (!createdUser) {
      throw new InternalServerErrorException('Failed to save user to database');
    }

    await this.redisService.del(`user:${email}`);

    return {
      userId: createdUser.id,
    };
  }

  async verifyResetPasswordOtp(userId: string, token: string) {
    let isValid: boolean;
    try {
      isValid = await this.verificationService.validateOtp(
        userId,
        token,
        'password',
      );
    } catch (error) {
      throw new InternalServerErrorException('Failed to validate OTP');
    }

    if (!isValid) {
      throw new UnprocessableEntityException('Expired or incorrect token');
    }

    // Generate secure token for password reset step
    let resetToken: string;
    try {
      resetToken = await this.verificationService.generatePasswordResetToken(userId);
    } catch (error) {
      throw new InternalServerErrorException('Failed to generate password reset token');
    }

    return {
      isValid: true,
      resetToken, // This token will be used in step 3
    };
  }

  async resetPassword(userId: string, newPassword: string, token: string) {
    const tokenData =
      await this.verificationService.validatePasswordResetToken(token);

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
        throw new BadRequestException(
          'New password must be different from the current password',
        );
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
    if (!user) throw new NotFoundException('User not found');

    if (user.password) {
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) throw new UnauthorizedException('Wrong password');
    }
    return user.id;
  }

  async login(loginDTO: LoginDTO) {
    const id = await this.validateUser(loginDTO.email, loginDTO.password);

    const userInstance = await this.userService.findUserById(id);
    const user = instanceToPlain(userInstance);

    if(!user) {
      throw new NotFoundException('User not found');
    }

    const { access_token, refresh_token } = await this.generateTokens(id);

    return { user, access_token, refresh_token };
  }

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ) {
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
    };
  }

  async refresh(token: string) {
    try {
      const payload: any = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_REFRESH_SECRET,
      });

      const exists = await this.redisService.get(`refresh:${payload.jti}`);
      if (!exists)
        throw new UnauthorizedException('Refresh token is invalid or expired');

      await this.redisService.del(`refresh:${payload.jti}`);

      return await this.generateTokens(payload.id);
    } catch (e) {
      console.log(e);
      if (e instanceof UnauthorizedException && e.message === 'Refresh token is invalid or expired') {
        throw e;
      }
      throw new UnauthorizedException('Invalid refresh token');
    }
  }


  async validateGoogleUser(googleUser: GoogleLoginDTO) {
    let user = await this.userService.findUserByGoogleId(googleUser.googleId);

    if (user) return user;

    if (googleUser.email) {
      user = await this.userService.findUserByEmail(googleUser.email);
      if (user) {
        const updatedUser = await this.userService.updateUser(user.id, {
          googleId: googleUser.googleId,
          avatarUrl: googleUser.avatarUrl,
        });

        if (!updatedUser) {
          throw new InternalServerErrorException('Failed to update user');
        }

        return updatedUser;
      }
    }

    return await this.userService.createUser({
      email: googleUser.email,
      firstName: googleUser.firstName,
      lastName: googleUser.lastName,
      avatarUrl: googleUser.avatarUrl,
      googleId: googleUser.googleId,
      password: '',
      phoneNumber: '',
    });
  }

  async validateFacebookUser(facebookUser: FacebookLoginDTO) {
    let user = await this.userService.findUserByFacebookId(
      facebookUser.facebookId,
    );

    //user has already signed in with facebook
    if (user) {
      return user;
    }

    //user has already signed in with this email, so it is the same record in db
    if (facebookUser.email) {
      user = await this.userService.findUserByEmail(facebookUser.email);
      if (user) {
        const updatedUser = await this.userService.updateUser(user.id, {
          facebookId: facebookUser.facebookId,
          avatarUrl: facebookUser.avatarUrl,
        });

        if (!updatedUser) {
          throw new InternalServerErrorException('Failed to update user');
        }

        return updatedUser;
      }
    }

    return await this.userService.createUser({
      email: facebookUser.email,
      firstName: facebookUser.firstName,
      lastName: facebookUser.lastName,
      facebookId: facebookUser.facebookId,
      avatarUrl: facebookUser.avatarUrl,
      phoneNumber: '',
      password: '', // No password for OAuth users
    });
  }

  /* 
      ######################### GitHub OAuth Routes #########################
  */
  async findOrCreateGitHubUser(githubData: GitHubUserDto): Promise<User> {
    let user = await this.userService.findUserByGithubId(githubData.githubId);
    if (user) {
      return user;
    }

    user = await this.userService.findUserByEmail(githubData.email);
    if (user) {
      const updatedUser = await this.userService.updateUser(user.id, {
        githubId: githubData.githubId,
        avatarUrl: githubData.avatarUrl,
      });

      if (!updatedUser) {
        throw new InternalServerErrorException('Failed to update user');
      }

      return updatedUser;
    }

    return await this.userService.createUser({
      email: githubData.email,
      firstName: githubData.firstName,
      lastName: githubData.lastName,
      githubId: githubData.githubId,
      avatarUrl: githubData.avatarUrl,
      phoneNumber: '', // Will be filled later if needed
      password: undefined, // No password for OAuth users
    });
  }
}
