import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async createUser(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.userRepository.findOne({
      where: { username: createUserDto.username },
    });

    if (existingUser) {
      throw new ConflictException('Username already exists');
    }

    const user = new User();
    user.username = createUserDto.username;
    user.passwordHash = await bcrypt.hash(createUserDto.password, 10);
    user.role = createUserDto.role;

    return this.userRepository.save(user);
  }

  async validateUser(loginUserDto: LoginUserDto): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { username: loginUserDto.username },
    });

    if (user && await bcrypt.compare(loginUserDto.password, user.passwordHash)) {
      return user;
    }
    throw new UnauthorizedException('Invalid credentials');
  }
} 