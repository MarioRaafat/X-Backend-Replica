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
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly entityManager: EntityManager,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { confirmPassword, password, ...registerUser } = registerDto;

    // Check if email is in use
    const existingUser = await this.userRepository.findOne({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Check that passwords match
    if (password !== confirmPassword) {
      throw new BadRequestException(
        'Confirmation password must match password',
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({ ...registerUser, password: hashedPassword });
    const createdUser = await this.entityManager.save(user);

    // Create token
    const payload = { id: createdUser.id, email: createdUser.email };
    return this.jwtService.sign(payload);
  }
}
