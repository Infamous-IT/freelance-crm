import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from '../service/auth.service';
import { UserService } from 'src/modules/user/service/user.service';
import { LoginDto } from '../dtos/login.dto';
import { RegisterDto } from '../dtos/register.dto';
import { RefreshTokenDto } from '../dtos/refresh-token.dto';
import { User } from 'src/modules/user/entities/user.entity';
import { Role } from '@prisma/client';
import { ConflictException } from '@nestjs/common';
import { UserWithOrderIncludesType } from 'src/modules/user/types/user-prisma-types.interface';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;
  let userService: jest.Mocked<UserService>;

  const mockUser: UserWithOrderIncludesType = {
    id: 'user-1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    country: 'Ukraine',
    password: 'hashedPassword123',
    isEmailVerified: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    role: Role.FREELANCER,
    orders: [],
  };

  const mockLoginDto: LoginDto = {
    email: 'john.doe@example.com',
    password: 'password123',
  };

  const mockRegisterDto: RegisterDto = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    password: 'password123',
    country: 'Ukraine',
    role: Role.FREELANCER,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  const mockRefreshTokenDto: RefreshTokenDto = {
    refreshToken: 'mock-refresh-token',
  };

  const mockTokens = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
  };

  beforeEach(async () => {
    const mockAuthService = {
      login: jest.fn(),
      register: jest.fn(),
      validateAccessToken: jest.fn(),
      generateTokens: jest.fn(),
      revokeAccessToken: jest.fn(),
    };

    const mockUserService = {
      findOneOrThrow: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
    userService = module.get(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      const mockLoginResponse = {
        message: 'Авторизація пройшла успішно',
        accessToken: mockTokens.accessToken,
        refreshToken: mockTokens.refreshToken,
      };

      authService.login.mockResolvedValue(mockLoginResponse);

      const result = await controller.login(mockLoginDto);

      expect(authService.login).toHaveBeenCalledWith(
        mockLoginDto.email,
        mockLoginDto.password,
      );
      expect(result).toEqual(mockLoginResponse);
    });

    it('should throw ConflictException when login fails', async () => {
      authService.login.mockRejectedValue(new ConflictException('Bad credentials'));

      await expect(controller.login(mockLoginDto)).rejects.toThrow(
        ConflictException
      );
      await expect(controller.login(mockLoginDto)).rejects.toThrow(
        'Bad credentials'
      );
      expect(authService.login).toHaveBeenCalledWith(
        mockLoginDto.email,
        mockLoginDto.password,
      );
    });

    it('should handle empty email in login', async () => {
      const emptyLoginDto = { ...mockLoginDto, email: '' };
      authService.login.mockRejectedValue(new ConflictException('Bad credentials'));

      await expect(controller.login(emptyLoginDto)).rejects.toThrow(
        ConflictException
      );
      expect(authService.login).toHaveBeenCalledWith('', mockLoginDto.password);
    });

    it('should handle empty password in login', async () => {
      const emptyPasswordLoginDto = { ...mockLoginDto, password: '' };
      authService.login.mockRejectedValue(new ConflictException('Bad credentials'));

      await expect(controller.login(emptyPasswordLoginDto)).rejects.toThrow(
        ConflictException
      );
      expect(authService.login).toHaveBeenCalledWith(mockLoginDto.email, '');
    });
  });

  describe('register', () => {
    it('should register user successfully', async () => {
      authService.register.mockResolvedValue(mockUser);

      const result = await controller.register(mockRegisterDto);

      expect(authService.register).toHaveBeenCalledWith(mockRegisterDto);
      expect(result).toEqual({
        message: 'Користувача успішно зареєстровано',
        user: {
          id: mockUser.id,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
          email: mockUser.email,
          country: mockUser.country,
          isEmailVerified: mockUser.isEmailVerified,
          createdAt: mockUser.createdAt,
          updatedAt: mockUser.updatedAt,
          role: mockUser.role,
          orders: mockUser.orders,
        },
      });
    });

    it('should throw ConflictException when user already exists', async () => {
      authService.register.mockRejectedValue(
        new ConflictException('Користувач з таким email вже існує')
      );

      await expect(controller.register(mockRegisterDto)).rejects.toThrow(
        ConflictException
      );
      await expect(controller.register(mockRegisterDto)).rejects.toThrow(
        'Користувач з таким email вже існує'
      );
      expect(authService.register).toHaveBeenCalledWith(mockRegisterDto);
    });

    it('should handle registration with invalid data', async () => {
      const invalidRegisterDto = { ...mockRegisterDto, email: 'invalid-email' };
      authService.register.mockRejectedValue(
        new ConflictException('Invalid email format')
      );

      await expect(controller.register(invalidRegisterDto)).rejects.toThrow(
        ConflictException
      );
      expect(authService.register).toHaveBeenCalledWith(invalidRegisterDto);
    });
  });

  describe('refresh', () => {
    it('should refresh token successfully', async () => {
      const mockPayload = { sub: mockUser.id, email: mockUser.email };
      authService.validateAccessToken.mockReturnValue(mockPayload);
      userService.findOneOrThrow.mockResolvedValue(mockUser);
      authService.generateTokens.mockReturnValue(mockTokens);

      const result = await controller.refresh(mockRefreshTokenDto);

      expect(authService.validateAccessToken).toHaveBeenCalledWith(
        mockRefreshTokenDto.refreshToken,
      );
      expect(userService.findOneOrThrow).toHaveBeenCalledWith(mockUser.id);
      expect(authService.generateTokens).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(mockTokens);
    });

    it('should throw UnauthorizedException when refresh token is invalid', async () => {
      authService.validateAccessToken.mockReturnValue(null);

      await expect(controller.refresh(mockRefreshTokenDto)).rejects.toThrow();
      expect(authService.validateAccessToken).toHaveBeenCalledWith(
        mockRefreshTokenDto.refreshToken,
      );
    });

    it('should handle user not found during refresh', async () => {
      const mockPayload = { sub: mockUser.id, email: mockUser.email };
      authService.validateAccessToken.mockReturnValue(mockPayload);
      userService.findOneOrThrow.mockRejectedValue(new Error('User not found'));

      await expect(controller.refresh(mockRefreshTokenDto)).rejects.toThrow();
      expect(authService.validateAccessToken).toHaveBeenCalledWith(
        mockRefreshTokenDto.refreshToken,
      );
      expect(userService.findOneOrThrow).toHaveBeenCalledWith(mockUser.id);
    });

    it('should handle empty refresh token', async () => {
      const emptyRefreshTokenDto = { refreshToken: '' };
      authService.validateAccessToken.mockReturnValue(null);

      await expect(controller.refresh(emptyRefreshTokenDto)).rejects.toThrow();
      expect(authService.validateAccessToken).toHaveBeenCalledWith('');
    });
  });

  describe('logout', () => {
    it('should logout user successfully', async () => {
      const mockRequest = {
        headers: {
          authorization: 'Bearer mock-access-token',
        },
      };

      authService.revokeAccessToken.mockResolvedValue(undefined);

      const result = await controller.logout(mockRequest);

      expect(authService.revokeAccessToken).toHaveBeenCalledWith('mock-access-token');
      expect(result).toEqual({
        message: 'Ви успішно вийшли з системи.',
      });
    });

    it('should handle logout without authorization header', async () => {
      const mockRequest = {
        headers: {},
      };

      authService.revokeAccessToken.mockResolvedValue(undefined);

      const result = await controller.logout(mockRequest);

      expect(authService.revokeAccessToken).toHaveBeenCalledWith(undefined);
      expect(result).toEqual({
        message: 'Ви успішно вийшли з системи.',
      });
    });

    it('should handle logout with malformed authorization header', async () => {
      const mockRequest = {
        headers: {
          authorization: 'InvalidFormat',
        },
      };

      authService.revokeAccessToken.mockResolvedValue(undefined);

      const result = await controller.logout(mockRequest);

      expect(authService.revokeAccessToken).toHaveBeenCalledWith(undefined);
      expect(result).toEqual({
        message: 'Ви успішно вийшли з системи.',
      });
    });

    it('should throw UnprocessableEntityException when revoking token fails', async () => {
      const mockRequest = {
        headers: {
          authorization: 'Bearer mock-access-token',
        },
      };

      authService.revokeAccessToken.mockRejectedValue(
        new Error('Error revoking access token')
      );

      await expect(controller.logout(mockRequest)).rejects.toThrow();
      expect(authService.revokeAccessToken).toHaveBeenCalledWith('mock-access-token');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null request in logout', async () => {
      const mockRequest = null as any;

      authService.revokeAccessToken.mockResolvedValue(undefined);

      await expect(controller.logout(mockRequest)).rejects.toThrow();
    });

    it('should handle undefined headers in logout', async () => {
      const mockRequest = {
        headers: undefined,
      };

      authService.revokeAccessToken.mockResolvedValue(undefined);

      await expect(controller.logout(mockRequest)).rejects.toThrow();
    });

    it('should handle empty authorization header in logout', async () => {
      const mockRequest = {
        headers: {
          authorization: '',
        },
      };

      authService.revokeAccessToken.mockResolvedValue(undefined);

      const result = await controller.logout(mockRequest);

      expect(authService.revokeAccessToken).toHaveBeenCalledWith(undefined);
      expect(result).toEqual({
        message: 'Ви успішно вийшли з системи.',
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle authService.login error', async () => {
      authService.login.mockRejectedValue(new Error('Service error'));

      await expect(controller.login(mockLoginDto)).rejects.toThrow(Error);
      expect(authService.login).toHaveBeenCalledWith(
        mockLoginDto.email,
        mockLoginDto.password,
      );
    });

    it('should handle authService.register error', async () => {
      authService.register.mockRejectedValue(new Error('Registration error'));

      await expect(controller.register(mockRegisterDto)).rejects.toThrow(Error);
      expect(authService.register).toHaveBeenCalledWith(mockRegisterDto);
    });

    it('should handle authService.validateAccessToken error', async () => {
      authService.validateAccessToken.mockImplementation(() => {
        throw new Error('Token validation error');
      });

      await expect(controller.refresh(mockRefreshTokenDto)).rejects.toThrow(Error);
      expect(authService.validateAccessToken).toHaveBeenCalledWith(
        mockRefreshTokenDto.refreshToken,
      );
    });

    it('should handle userService.findOneOrThrow error', async () => {
      const mockPayload = { sub: mockUser.id, email: mockUser.email };
      authService.validateAccessToken.mockReturnValue(mockPayload);
      userService.findOneOrThrow.mockRejectedValue(new Error('User not found'));

      await expect(controller.refresh(mockRefreshTokenDto)).rejects.toThrow(Error);
      expect(userService.findOneOrThrow).toHaveBeenCalledWith(mockUser.id);
    });

    it('should handle authService.generateTokens error', async () => {
      const mockPayload = { sub: mockUser.id, email: mockUser.email };
      authService.validateAccessToken.mockReturnValue(mockPayload);
      userService.findOneOrThrow.mockResolvedValue(mockUser);
      authService.generateTokens.mockImplementation(() => {
        throw new Error('Token generation error');
      });

      await expect(controller.refresh(mockRefreshTokenDto)).rejects.toThrow(Error);
      expect(authService.generateTokens).toHaveBeenCalledWith(mockUser);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete login flow', async () => {
      const mockLoginResponse = {
        message: 'Авторизація пройшла успішно',
        accessToken: mockTokens.accessToken,
        refreshToken: mockTokens.refreshToken,
      };

      authService.login.mockResolvedValue(mockLoginResponse);

      const result = await controller.login(mockLoginDto);

      expect(result).toHaveProperty('message', 'Авторизація пройшла успішно');
      expect(result).toHaveProperty('accessToken', mockTokens.accessToken);
      expect(result).toHaveProperty('refreshToken', mockTokens.refreshToken);
    });

    it('should handle complete registration flow', async () => {
      authService.register.mockResolvedValue(mockUser);

      const result = await controller.register(mockRegisterDto);

      expect(result).toHaveProperty('message', 'Користувача успішно зареєстровано');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe(mockRegisterDto.email);
      expect(result.user.firstName).toBe(mockRegisterDto.firstName);
      expect(result.user.lastName).toBe(mockRegisterDto.lastName);
    });

    it('should handle complete refresh flow', async () => {
      const mockPayload = { sub: mockUser.id, email: mockUser.email };
      authService.validateAccessToken.mockReturnValue(mockPayload);
      userService.findOneOrThrow.mockResolvedValue(mockUser);
      authService.generateTokens.mockReturnValue(mockTokens);

      const result = await controller.refresh(mockRefreshTokenDto);

      expect(result).toHaveProperty('accessToken', mockTokens.accessToken);
      expect(result).toHaveProperty('refreshToken', mockTokens.refreshToken);
    });

    it('should handle complete logout flow', async () => {
      const mockRequest = {
        headers: {
          authorization: 'Bearer mock-access-token',
        },
      };

      authService.revokeAccessToken.mockResolvedValue(undefined);

      const result = await controller.logout(mockRequest);

      expect(result).toHaveProperty('message', 'Ви успішно вийшли з системи.');
      expect(authService.revokeAccessToken).toHaveBeenCalledWith('mock-access-token');
    });
  });
});
