import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import * as bcrypt from 'bcrypt';
import { JwtPayload } from './strategies/jwt-payload.interface';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async registerUser(createUserDto: CreateUserDto): Promise<{
    username: string;
    role: UserRole;
  }> {
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

    const createdUser = await this.userRepository.save(user);

    return {
      username: createdUser.username,
      role: createdUser.role,
    };
  }

  async loginUser(loginUserDto: LoginUserDto): Promise<{
    accessToken: string;
  }> {
    const user = await this.userRepository.findOne({
      where: { username: loginUserDto.username },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(loginUserDto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const jwtPayload: JwtPayload = {
      username: user.username,
      sub: user.id,
      role: user.role,
    };

    return { accessToken: this.jwtService.sign(jwtPayload) };
  }

  async validateJwtPayload(payload: JwtPayload): Promise<User> {
    return this.userRepository.findOne({ where: { username: payload.username } });
  }
} 
