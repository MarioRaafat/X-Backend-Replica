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
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly entityManager: EntityManager,
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly redisService: RedisService,
    private readonly verificationService: VerificationService,
    private readonly emailService: EmailService,
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
    const { confirmPassword, password, ...registerUser } = registerDto;

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
    const user = await this.userService.createUser({
       ...registerUser,
        password: hashedPassword,
        provider: 'local',
        verified: false
    });

    // Send verification email
    const sendEmailRes = await this.generateEmailVerification(user.id);

    return { 
      email: sendEmailRes.success,
      userId: user.id,
      message: 'User registered successfully'
    };
  }

  async generateEmailVerification(userId: string) {
    const user = await this.userService.findUserById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.verified) {
      throw new UnprocessableEntityException('Account already verified');
    }

    const otp = await this.verificationService.generateOtp(user.id, 'email');

    // don't forget to change "MyApp"
    const emailSent = await this.emailService.sendEmail({
      subject: 'MyApp - Account Verification',
      recipients: [{ name: user.firstName ?? '', address: user.email }],
      html: `<p>Hi${user.firstName ? ' ' + user.firstName : ''},</p><p>You may verify your MyApp account using the following OTP: <br /><span style="font-size:24px; font-weight: 700;">${otp}</span></p><p>Regards,<br />MyApp</p>`,
    });

    if (!emailSent) {
      throw new InternalServerErrorException('Failed to send OTP email');
    }

    return {
      success: emailSent.success,
      message: 'Verification OTP sent to email',
    };
  }

  async verifyEmail(userId: string, token: string) {
    const user = await this.userService.findUserById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.verified) {
      throw new UnprocessableEntityException('Account already verified');
    }

    const isValid = await this.verificationService.validateOtp(
      userId,
      token,
      'email',
    );

    if (!isValid) {
      throw new UnprocessableEntityException('Expired or incorrect token');
    }

    await this.userService.updateUser(userId, { verified: true });

    return {
      success: true,
      message: 'Email verified successfully'
    };
  }

  async validateUser(email: string, password: string): Promise<string> {
    const user = await this.userService.findUserByEmail(email);
    if (!user)
      throw new UnauthorizedException('Something wrong with email or password');
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid)
      throw new UnauthorizedException('Something wrong with email or password');
    return user.id;
  }

  async login(loginDTO: LoginDTO) {
    const id = await this.validateUser(loginDTO.email, loginDTO.password);

    return this.generateTokens(id);
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

  /* 
      ######################### GitHub OAuth Routes #########################
  */
  async findOrCreateGitHubUser(githubData: GitHubUserDto): Promise<User> {
    let user = await this.userService.findUserByGithubId(githubData.githubId);
    if (user) {
      return user;
    }

    // check same email (I think I will change it later)
    user = await this.userService.findUserByEmail(githubData.email);
    
    if (user) {
      const updatedUser = await this.userService.updateUser(user.id, {
        githubId: githubData.githubId,
        avatarUrl: githubData.avatarUrl,
        provider: 'github',
        verified: true
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
      provider: 'github',
      verified: true, // GitHub emails are pre-verified
      phoneNumber: '', // Will be filled later if needed
      password: undefined // No password for OAuth users
    });
  }
}