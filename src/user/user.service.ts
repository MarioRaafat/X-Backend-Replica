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

  async createUser(createUserDto: CreateUserDto): Promise<User> {
    const user = new User({
      ...createUserDto,
      provider: createUserDto.provider || 'local',
      verified: createUserDto.verified || false,
    });
    return await this.userRepository.save(user);
  }

  async updateUser(id: string, updateData: Partial<User>) {
    await this.userRepository.update(id, updateData);
    return await this.findUserById(id);
  }
}
