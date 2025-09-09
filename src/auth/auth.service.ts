import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/user/entities/user.entity';
import { Repository, EntityManager } from 'typeorm';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly entityManager: EntityManager,
  ) {}

  async register(registerDto: RegisterDto) {
    const { confirmPassword, password, ...registerUser } = registerDto;

    const existingUser = await this.userRepository.findOne({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    if (password !== confirmPassword) {
      throw new BadRequestException(
        'Confirmation password must match password',
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({ ...registerUser, password: hashedPassword });
    return await this.entityManager.save(user);
  }
}
