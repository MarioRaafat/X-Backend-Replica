import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {}

  async findUserById(id: string) {
    return await this.userRepository.findOne({ where: { id } });
  }

  async findUserByEmail(email: string) {
    return await this.userRepository.findOne({ where: { email } });
  }

  async findUserByGithubId(githubId: string) {
    return await this.userRepository.findOne({ where: { githubId } });
  }

  async findUserByFacebookId(facebookId: string) {
    return await this.userRepository.findOne({ where: { facebookId } });
  }

  async findUserByGoogleId(googleId: string) {
    return await this.userRepository.findOne({ where: { googleId } });
  }

  async createUser(createUserDto: CreateUserDto): Promise<User> {
    const user = new User({
      ...createUserDto,
    });
    return await this.userRepository.save(user);
  }

  async updateUser(id: string, updateData: Partial<User>) {
    await this.userRepository.update(id, updateData);
    return await this.findUserById(id);
  }

  async updateUserPassword(id: string, newPassword: string) {
    await this.userRepository.update(id, { password: newPassword });
    return await this.findUserById(id);
  }
}
