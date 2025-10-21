import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';

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
}
