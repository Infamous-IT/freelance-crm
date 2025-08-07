import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException, UnprocessableEntityException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserService } from 'src/modules/user/service/user.service';
import { RegisterDto } from '../dtos/register.dto';
import { User } from 'src/modules/user/entities/user.entity';
import { Role } from '@prisma/client';
import { RedisClientType } from 'redis';
import * as bcrypt from 'bcryptjs';

jest.mock('src/common/logger/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let userService: jest.Mocked<UserService>;
  let jwtService: jest.Mocked<JwtService>;
  let redisClient: jest.Mocked<RedisClientType>;

  const mockUser: User = {
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

  const mockTokens = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
  };

  beforeEach(async () => {
    const mockUserService = {
      findByEmail: jest.fn(),
      create: jest.fn(),
    };

    const mockJwtService = {
      sign: jest.fn(),
      verify: jest.fn(),
    };

    const mockRedisClient = {
      set: jest.fn(),
      get: jest.fn(),
      ttl: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: 'REDIS_CLIENT',
          useValue: mockRedisClient,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userService = module.get(UserService);
    jwtService = module.get(JwtService);
    redisClient = module.get('REDIS_CLIENT');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateTokens', () => {
    it('should generate access and refresh tokens successfully', () => {
      jwtService.sign
        .mockReturnValueOnce(mockTokens.accessToken)
        .mockReturnValueOnce(mockTokens.refreshToken);

      const result = service.generateTokens(mockUser);

      expect(jwtService.sign).toHaveBeenCalledTimes(2);
      expect(jwtService.sign).toHaveBeenCalledWith(
        { sub: mockUser.id, email: mockUser.email },
        {
          expiresIn: process.env.EXPIRATION_TIME_FOR_ACCESS_TOKEN,
          secret: process.env.JWT_SECRET_TOKEN,
        }
      );
      expect(jwtService.sign).toHaveBeenCalledWith(
        { sub: mockUser.id, email: mockUser.email },
        {
          expiresIn: process.env.EXPIRATION_TIME_FOR_REFRESH_TOKEN,
          secret: process.env.JWT_REFRESH_TOKEN,
        }
      );
      expect(result).toEqual(mockTokens);
    });

    it('should throw UnprocessableEntityException when token generation fails', () => {
      jwtService.sign.mockImplementation(() => {
        throw new Error('JWT signing failed');
      });

      expect(() => service.generateTokens(mockUser)).toThrow(
        UnprocessableEntityException
      );
      expect(() => service.generateTokens(mockUser)).toThrow(
        'Failed to generate access and refresh tokens'
      );
    });
  });

  describe('validateAccessToken', () => {
    it('should validate access token successfully', () => {
      const mockPayload = { sub: mockUser.id, email: mockUser.email };
      jwtService.verify.mockReturnValue(mockPayload);

      const result = service.validateAccessToken('valid-token');

      expect(jwtService.verify).toHaveBeenCalledWith('valid-token', {
        secret: process.env.JWT_SECRET_TOKEN,
      });
      expect(result).toEqual(mockPayload);
    });

    it('should return null when token validation fails', () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = service.validateAccessToken('invalid-token');

      expect(jwtService.verify).toHaveBeenCalledWith('invalid-token', {
        secret: process.env.JWT_SECRET_TOKEN,
      });
      expect(result).toBeNull();
    });
  });

  describe('comparePassword', () => {
    it('should compare passwords successfully', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.comparePassword('password123', 'hashedPassword123');

      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedPassword123');
      expect(result).toBe(true);
    });

    it('should return false when passwords do not match', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.comparePassword('wrongpassword', 'hashedPassword123');

      expect(bcrypt.compare).toHaveBeenCalledWith('wrongpassword', 'hashedPassword123');
      expect(result).toBe(false);
    });
  });

  describe('validateUser', () => {
    it('should validate user successfully', async () => {
      userService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('john.doe@example.com', 'password123');

      expect(userService.findByEmail).toHaveBeenCalledWith('john.doe@example.com');
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', mockUser.password);
      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      userService.findByEmail.mockResolvedValue(null);

      await expect(service.validateUser('nonexistent@example.com', 'password123')).rejects.toThrow(
        UnauthorizedException
      );
      await expect(service.validateUser('nonexistent@example.com', 'password123')).rejects.toThrow(
        'Невірні облікові дані'
      );
      expect(userService.findByEmail).toHaveBeenCalledWith('nonexistent@example.com');
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      userService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.validateUser('john.doe@example.com', 'wrongpassword')).rejects.toThrow(
        UnauthorizedException
      );
      await expect(service.validateUser('john.doe@example.com', 'wrongpassword')).rejects.toThrow(
        'Невірні облікові дані'
      );
      expect(userService.findByEmail).toHaveBeenCalledWith('john.doe@example.com');
      expect(bcrypt.compare).toHaveBeenCalledWith('wrongpassword', mockUser.password);
    });
  });

  describe('register', () => {
    it('should register user successfully', async () => {
      userService.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword123');
      userService.create.mockResolvedValue(mockUser);

      const result = await service.register(mockRegisterDto);

      expect(userService.findByEmail).toHaveBeenCalledWith(mockRegisterDto.email);
      expect(bcrypt.hash).toHaveBeenCalledWith(mockRegisterDto.password, 10);
      expect(userService.create).toHaveBeenCalledWith({
        ...mockRegisterDto,
        password: 'hashedPassword123',
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw ConflictException when user already exists', async () => {
      userService.findByEmail.mockResolvedValue(mockUser);

      await expect(service.register(mockRegisterDto)).rejects.toThrow(ConflictException);
      await expect(service.register(mockRegisterDto)).rejects.toThrow(
        'Користувач з таким email вже існує'
      );
      expect(userService.findByEmail).toHaveBeenCalledWith(mockRegisterDto.email);
    });

    it('should throw UnprocessableEntityException when registration fails', async () => {
      userService.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockRejectedValue(new Error('Hashing failed'));

      await expect(service.register(mockRegisterDto)).rejects.toThrow(
        UnprocessableEntityException
      );
      await expect(service.register(mockRegisterDto)).rejects.toThrow(
        'Failed to register user'
      );
      expect(userService.findByEmail).toHaveBeenCalledWith(mockRegisterDto.email);
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      userService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.sign
        .mockReturnValueOnce(mockTokens.accessToken)
        .mockReturnValueOnce(mockTokens.refreshToken);

      const result = await service.login('john.doe@example.com', 'password123');

      expect(userService.findByEmail).toHaveBeenCalledWith('john.doe@example.com');
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', mockUser.password);
      expect(jwtService.sign).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        message: 'Авторизація пройшла успішно',
        accessToken: mockTokens.accessToken,
        refreshToken: mockTokens.refreshToken,
      });
    });

    it('should throw ConflictException when login fails', async () => {
      userService.findByEmail.mockResolvedValue(null);

      await expect(service.login('nonexistent@example.com', 'password123')).rejects.toThrow(
        ConflictException
      );
      await expect(service.login('nonexistent@example.com', 'password123')).rejects.toThrow(
        'Bad credentials'
      );
      expect(userService.findByEmail).toHaveBeenCalledWith('nonexistent@example.com');
    });
  });

  describe('revokeAccessToken', () => {
    it('should revoke access token successfully', async () => {
      redisClient.set.mockResolvedValue('OK');

      await service.revokeAccessToken('access-token');

      expect(redisClient.set).toHaveBeenCalledWith('access-token', 'revoked', { EX: 3600 });
    });

    it('should throw UnprocessableEntityException when revoking token fails', async () => {
      redisClient.set.mockRejectedValue(new Error('Redis error'));

      await expect(service.revokeAccessToken('access-token')).rejects.toThrow(
        UnprocessableEntityException
      );
      await expect(service.revokeAccessToken('access-token')).rejects.toThrow(
        'Error revoking access token'
      );
      expect(redisClient.set).toHaveBeenCalledWith('access-token', 'revoked', { EX: 3600 });
    });
  });

  describe('isAccessTokenRevoked', () => {
    it('should return true when token is revoked', async () => {
      redisClient.get.mockResolvedValue('revoked');

      const result = await service.isAccessTokenRevoked('access-token');

      expect(redisClient.get).toHaveBeenCalledWith('access-token');
      expect(result).toBe(true);
    });

    it('should return false when token is not revoked', async () => {
      redisClient.get.mockResolvedValue(null);

      const result = await service.isAccessTokenRevoked('access-token');

      expect(redisClient.get).toHaveBeenCalledWith('access-token');
      expect(result).toBe(false);
    });

    it('should throw UnprocessableEntityException when checking token revocation fails', async () => {
      redisClient.get.mockRejectedValue(new Error('Redis error'));

      await expect(service.isAccessTokenRevoked('access-token')).rejects.toThrow(
        UnprocessableEntityException
      );
      await expect(service.isAccessTokenRevoked('access-token')).rejects.toThrow(
        'Error checking token revocation'
      );
      expect(redisClient.get).toHaveBeenCalledWith('access-token');
    });
  });

  describe('getTokenTTL', () => {
    it('should return TTL for token successfully', async () => {
      redisClient.ttl.mockResolvedValue(1800);

      const result = await service.getTokenTTL('access-token');

      expect(redisClient.ttl).toHaveBeenCalledWith('access-token');
      expect(result).toBe(1800);
    });

    it('should throw UnprocessableEntityException when getting TTL fails', async () => {
      redisClient.ttl.mockRejectedValue(new Error('Redis error'));

      await expect(service.getTokenTTL('access-token')).rejects.toThrow(
        UnprocessableEntityException
      );
      await expect(service.getTokenTTL('access-token')).rejects.toThrow(
        'Error getting TTL for token'
      );
      expect(redisClient.ttl).toHaveBeenCalledWith('access-token');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty email in validateUser', async () => {
      userService.findByEmail.mockResolvedValue(null);

      await expect(service.validateUser('', 'password123')).rejects.toThrow(
        UnauthorizedException
      );
      expect(userService.findByEmail).toHaveBeenCalledWith('');
    });

    it('should handle empty password in validateUser', async () => {
      userService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.validateUser('john.doe@example.com', '')).rejects.toThrow(
        UnauthorizedException
      );
      expect(bcrypt.compare).toHaveBeenCalledWith('', mockUser.password);
    });

    it('should handle null user in validateUser', async () => {
      userService.findByEmail.mockResolvedValue(null);

      await expect(service.validateUser('john.doe@example.com', 'password123')).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should handle undefined user in validateUser', async () => {
      userService.findByEmail.mockResolvedValue(undefined as any);

      await expect(service.validateUser('john.doe@example.com', 'password123')).rejects.toThrow(
        UnauthorizedException
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle bcrypt compare error in validateUser', async () => {
      userService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockRejectedValue(new Error('Bcrypt error'));

      await expect(service.validateUser('john.doe@example.com', 'password123')).rejects.toThrow(
        Error
      );
      await expect(service.validateUser('john.doe@example.com', 'password123')).rejects.toThrow(
        'Bcrypt error'
      );
    });

    it('should handle userService.create error in register', async () => {
      userService.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword123');
      userService.create.mockRejectedValue(new Error('Database error'));

      await expect(service.register(mockRegisterDto)).rejects.toThrow(
        UnprocessableEntityException
      );
    });

    it('should handle validateUser error in login', async () => {
      userService.findByEmail.mockResolvedValue(null);

      await expect(service.login('john.doe@example.com', 'password123')).rejects.toThrow(
        ConflictException
      );
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete login flow', async () => {
      userService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.sign
        .mockReturnValueOnce(mockTokens.accessToken)
        .mockReturnValueOnce(mockTokens.refreshToken);

      const result = await service.login('john.doe@example.com', 'password123');

      expect(result).toHaveProperty('message', 'Авторизація пройшла успішно');
      expect(result).toHaveProperty('accessToken', mockTokens.accessToken);
      expect(result).toHaveProperty('refreshToken', mockTokens.refreshToken);
    });

    it('should handle complete registration flow', async () => {
      userService.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword123');
      userService.create.mockResolvedValue(mockUser);

      const result = await service.register(mockRegisterDto);

      expect(result).toEqual(mockUser);
      expect(result.email).toBe(mockRegisterDto.email);
      expect(result.firstName).toBe(mockRegisterDto.firstName);
      expect(result.lastName).toBe(mockRegisterDto.lastName);
    });
  });
});