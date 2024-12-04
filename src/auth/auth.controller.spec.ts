import { Test } from '@nestjs/testing';
import { TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User, UserRole } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            registerUser: jest.fn().mockResolvedValue({ username: 'testuser', role: UserRole.CUSTOMER }),
            loginUser: jest.fn().mockResolvedValue({ accessToken: 'token' }),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  it('should register a user', async () => {
    const user: CreateUserDto = {
      username: 'testuser',
      password: 'password',
      role: UserRole.CUSTOMER,
    };
    const result = await controller.register(user);
    expect(result).toEqual({ username: 'testuser', role: UserRole.CUSTOMER });

    expect(service.registerUser).toHaveBeenCalledWith(user);
  });

  it('should login a user', async () => {
    const user: LoginUserDto = { username: 'testuser', password: 'password' };
    const result = await controller.login(user);
    expect(result).toEqual({ accessToken: 'token' });
    expect(service.loginUser).toHaveBeenCalledWith(user);
  });
});
