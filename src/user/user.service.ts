import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { UserProfileDto } from './dto/user-profile.dto';
import { plainToInstance } from 'class-transformer';
import { ERROR_MESSAGES } from 'src/constants/swagger-messages';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly user_repository: Repository<User>,
  ) {}

  // Auth

  async findUserById(id: string) {
    return await this.user_repository.findOne({ where: { id } });
  }

  async findUserByEmail(email: string) {
    return await this.user_repository.findOne({ where: { email } });
  }

  async findUserByGithubId(github_id: string) {
    return await this.user_repository.findOne({
      where: { github_id: github_id },
    });
  }

  async findUserByFacebookId(facebook_id: string) {
    return await this.user_repository.findOne({
      where: { facebook_id: facebook_id },
    });
  }

  async findUserByGoogleId(google_id: string) {
    return await this.user_repository.findOne({
      where: { google_id: google_id },
    });
  }

  async findUserByUsername(username: string) {
    return await this.user_repository.findOne({
      where: { username: username },
    });
  }

  async findUserByPhoneNumber(phone_number: string) {
    return await this.user_repository.findOne({
      where: { phone_number: phone_number },
    });
  }

  async createUser(createUserDto: CreateUserDto): Promise<User> {
    const user = new User({
      ...createUserDto,
    });
    return await this.user_repository.save(user);
  }

  async updateUser(id: string, update_data: Partial<User>) {
    await this.user_repository.update(id, update_data);
    return await this.findUserById(id);
  }

  async updateUserPassword(id: string, new_password: string) {
    await this.user_repository.update(id, { password: new_password });
    return await this.findUserById(id);
  }

  async getMe(user_id: string): Promise<UserProfileDto> {
    const result = await this.user_repository
      .createQueryBuilder('user')
      .leftJoin('user_follows', 'followers', 'followers.followed_id = user.id')
      .leftJoin('user_follows', 'following', 'following.follower_id = user.id')
      .select([
        'user.id AS user_id',
        'user.name AS name',
        'user.username AS username',
        'user.bio AS bio',
        'user.avatar_url AS avatar_url',
        'user.cover_url AS cover_url',
        // 'user.country AS country', // To be added later
        'user.created_at AS created_at',
        'COUNT(DISTINCT followers.follower_id) AS followers_count',
        'COUNT(DISTINCT following.followed_id) AS following_count',
      ])
      .where('user.id = :user_id', { user_id })
      .groupBy('user.id')
      .addGroupBy('user.name')
      .addGroupBy('user.username')
      .addGroupBy('user.bio')
      .addGroupBy('user.avatar_url')
      .addGroupBy('user.cover_url')
      // .addGroupBy('user.country')  // To be added later
      .addGroupBy('user.created_at')
      .getRawOne<UserProfileDto>();

    if (!result) {
      throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    return plainToInstance(UserProfileDto, result, {
      enableImplicitConversion: true,
    });
  }

  async getUserById(current_user_id: string, target_user_id: string) {}
}
