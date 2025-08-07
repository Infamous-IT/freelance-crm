import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { UserService } from './user.service';
import { UserRepository } from '../repository/user.repository';
import { Role, User } from '@prisma/client';
import { RedisClientType } from 'redis';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { GetUsersDto } from '../dto/get-users.dto';
import { UserSecure } from '../entities/user.entity';
import { PaginatedUsers } from '../interfaces/user.interface';
import { UserWithOrderIncludesType } from '../types/user-prisma-types.interface';

jest.mock('../../../common/logger/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

describe('UserService', () => {
  let service: UserService;
  let userRepository: jest.Mocked<UserRepository>;
  let redisClient: jest.Mocked<RedisClientType>;

  const mockUser: User = {
    id: 'user-1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    password: 'hashedPassword123',
    country: 'Ukraine',
    isEmailVerified: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    role: Role.FREELANCER,
  };

  const mockUserSecure: UserSecure = {
    id: 'user-1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    country: 'Ukraine',
    isEmailVerified: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    role: Role.FREELANCER,
  };

  const mockUserWithOrders: UserWithOrderIncludesType = {
    ...mockUser,
    orders: [],
  };

  const mockPaginatedUsers: PaginatedUsers = {
    data: [mockUser],
    totalCount: 1,
    totalPages: 1,
    currentPage: 1,
  };

  beforeEach(async () => {
    const mockUserRepository = {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    };

    const mockRedisClient = {
      keys: jest.fn(),
      del: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: UserRepository,
          useValue: mockUserRepository,
        },
        {
          provide: 'REDIS_CLIENT',
          useValue: mockRedisClient,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userRepository = module.get(UserRepository);
    redisClient = module.get('REDIS_CLIENT');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createUserDto: CreateUserDto = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      password: 'password123',
      country: 'Ukraine',
      isEmailVerified: false,
      role: Role.FREELANCER,
    };

    it('should create user successfully', async () => {
      userRepository.create.mockResolvedValue(mockUser);
      redisClient.keys.mockResolvedValue(['users:cache1', 'users:cache2']);
      redisClient.del.mockResolvedValue(2);

      const result = await service.create(createUserDto);

      expect(userRepository.create).toHaveBeenCalledWith({
        data: createUserDto,
      });
      expect(redisClient.keys).toHaveBeenCalledWith('users:*');
      expect(redisClient.del).toHaveBeenCalledWith(['users:cache1', 'users:cache2']);
      expect(result).toEqual(mockUser);
    });

    it('should throw UnprocessableEntityException when repository fails', async () => {
      const error = new Error('Database error');
      userRepository.create.mockRejectedValue(error);

      await expect(service.create(createUserDto)).rejects.toThrow(
        UnprocessableEntityException
      );
      await expect(service.create(createUserDto)).rejects.toThrow(
        'Failed to creating user'
      );
    });

    it('should handle repository error with non-Error object', async () => {
      userRepository.create.mockRejectedValue('String error');

      await expect(service.create(createUserDto)).rejects.toThrow(
        UnprocessableEntityException
      );
    });
  });

  describe('findAll', () => {
    const getUsersDto: GetUsersDto = {
      searchText: 'john',
      orderBy: { field: 'firstName', sorting: 'asc' },
      role: Role.FREELANCER,
      country: 'Ukraine',
    };

    it('should return paginated users with search and filters', async () => {
      const mockPaginatedResult = {
        data: [mockUser],
        meta: {
          total: 1,
          lastPage: 1,
          currentPage: 1,
          perPage: 10,
          prev: null,
          next: null,
        },
      };

      userRepository.findMany = jest.fn().mockResolvedValue([mockUser]);
      userRepository.count = jest.fn().mockResolvedValue(1);

      jest.doMock('src/common/pagination/paginator', () => ({
        paginate: jest.fn().mockResolvedValue(mockPaginatedResult),
      }));

      const result = await service.findAll(getUsersDto, 1, 10);

      expect(result).toEqual(mockPaginatedUsers);
    });

    it('should handle search text with multiple terms', async () => {
      const searchDto: GetUsersDto = {
        searchText: 'john doe',
        orderBy: { field: 'firstName', sorting: 'asc' },
      };

      const mockPaginatedResult = {
        data: [mockUser],
        meta: {
          total: 1,
          lastPage: 1,
          currentPage: 1,
          perPage: 10,
          prev: null,
          next: null,
        },
      };

      userRepository.findMany = jest.fn().mockResolvedValue([mockUser]);
      userRepository.count = jest.fn().mockResolvedValue(1);

      const result = await service.findAll(searchDto, 1, 10);

      expect(result).toBeDefined();
    });

    it('should handle empty search text', async () => {
      const emptySearchDto: GetUsersDto = {
        orderBy: { field: 'firstName', sorting: 'asc' },
      };

      const mockPaginatedResult = {
        data: [mockUser],
        meta: {
          total: 1,
          lastPage: 1,
          currentPage: 1,
          perPage: 10,
          prev: null,
          next: null,
        },
      };

      userRepository.findMany = jest.fn().mockResolvedValue([mockUser]);
      userRepository.count = jest.fn().mockResolvedValue(1);

      const result = await service.findAll(emptySearchDto, 1, 10);

      expect(result).toBeDefined();
    });

    it('should throw UnprocessableEntityException when repository fails', async () => {
      userRepository.findMany = jest.fn().mockRejectedValue(new Error('Database error'));

      await expect(service.findAll(getUsersDto, 1, 10)).rejects.toThrow(
        UnprocessableEntityException
      );
      await expect(service.findAll(getUsersDto, 1, 10)).rejects.toThrow(
        'Failed to get list of users'
      );
    });
  });

  describe('clearCache', () => {
    it('should clear cache when keys exist', async () => {
      const cacheKeys = ['users:cache1', 'users:cache2'];
      redisClient.keys.mockResolvedValue(cacheKeys);
      redisClient.del.mockResolvedValue(2);

      await service.clearCache();

      expect(redisClient.keys).toHaveBeenCalledWith('users:*');
      expect(redisClient.del).toHaveBeenCalledWith(cacheKeys);
    });

    it('should not call del when no cache keys exist', async () => {
      redisClient.keys.mockResolvedValue([]);

      await service.clearCache();

      expect(redisClient.keys).toHaveBeenCalledWith('users:*');
      expect(redisClient.del).not.toHaveBeenCalled();
    });

    it('should handle Redis error gracefully', async () => {
      redisClient.keys.mockRejectedValue(new Error('Redis error'));

      await expect(service.clearCache()).rejects.toThrow('Redis error');
    });
  });

  describe('findOneOrThrow', () => {
    it('should return user when found', async () => {
      userRepository.findUnique.mockResolvedValue(mockUserWithOrders);

      const result = await service.findOneOrThrow('user-1');

      expect(userRepository.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        include: { orders: true },
      });
      expect(result).toEqual(mockUserWithOrders);
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepository.findUnique.mockResolvedValue(null);

      await expect(service.findOneOrThrow('non-existent')).rejects.toThrow(
        NotFoundException
      );
      await expect(service.findOneOrThrow('non-existent')).rejects.toThrow(
        'User with ID non-existent not found'
      );
    });
  });

  describe('getUserOrderWithUser', () => {
    it('should return user with orders when found', async () => {
      userRepository.findUnique.mockResolvedValue(mockUserWithOrders);

      const result = await service.getUserOrderWithUser('user-1');

      expect(userRepository.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        include: { orders: true },
      });
      expect(result).toEqual(mockUserWithOrders);
    });

    it('should return null when user not found', async () => {
      userRepository.findUnique.mockResolvedValue(null);

      const result = await service.getUserOrderWithUser('non-existent');

      expect(result).toBeNull();
    });

    it('should throw UnprocessableEntityException when repository fails', async () => {
      userRepository.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(service.getUserOrderWithUser('user-1')).rejects.toThrow(
        UnprocessableEntityException
      );
      await expect(service.getUserOrderWithUser('user-1')).rejects.toThrow(
        'Failed to get user with order info'
      );
    });
  });

  describe('findByEmail', () => {
    it('should return user when found by email', async () => {
      userRepository.findUnique.mockResolvedValue(mockUser);

      const result = await service.findByEmail('john.doe@example.com');

      expect(userRepository.findUnique).toHaveBeenCalledWith({
        where: { email: 'john.doe@example.com' },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found by email', async () => {
      userRepository.findUnique.mockResolvedValue(null);

      const result = await service.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });

    it('should throw NotFoundException when repository fails', async () => {
      userRepository.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(service.findByEmail('test@example.com')).rejects.toThrow(
        NotFoundException
      );
      await expect(service.findByEmail('test@example.com')).rejects.toThrow(
        'Not found email'
      );
    });
  });

  describe('update', () => {
    const updateUserDto: UpdateUserDto = {
      firstName: 'Jane',
      lastName: 'Smith',
    };

    it('should update user successfully when user is ADMIN', async () => {
      const adminUser: UserSecure = { ...mockUserSecure, role: Role.ADMIN };
      userRepository.findUnique.mockResolvedValue(mockUserWithOrders);
      userRepository.update.mockResolvedValue({ ...mockUser, ...updateUserDto });
      redisClient.keys.mockResolvedValue(['users:cache1']);
      redisClient.del.mockResolvedValue(1);

      const result = await service.update('user-1', updateUserDto, adminUser);

      expect(userRepository.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: updateUserDto,
      });
      expect(result).toEqual({ ...mockUser, ...updateUserDto });
    });

    it('should update user successfully when user updates their own profile', async () => {
      userRepository.findUnique.mockResolvedValue(mockUserWithOrders);
      userRepository.update.mockResolvedValue({ ...mockUser, ...updateUserDto });
      redisClient.keys.mockResolvedValue(['users:cache1']);
      redisClient.del.mockResolvedValue(1);

      const result = await service.update('user-1', updateUserDto, mockUserSecure);

      expect(userRepository.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: updateUserDto,
      });
      expect(result).toEqual({ ...mockUser, ...updateUserDto });
    });

    it('should throw ForbiddenException when user tries to update another user profile', async () => {
      const otherUser: UserSecure = { ...mockUserSecure, id: 'user-2' };
      userRepository.findUnique.mockResolvedValue(mockUserWithOrders);

      await expect(service.update('user-1', updateUserDto, otherUser)).rejects.toThrow(
        ForbiddenException
      );
      await expect(service.update('user-1', updateUserDto, otherUser)).rejects.toThrow(
        'Ви можете оновлювати тільки свій профіль'
      );
    });

    it('should throw UnprocessableEntityException when repository fails', async () => {
      userRepository.findUnique.mockResolvedValue(mockUserWithOrders);
      userRepository.update.mockRejectedValue(new Error('Database error'));

      await expect(service.update('user-1', updateUserDto, mockUserSecure)).rejects.toThrow(
        UnprocessableEntityException
      );
      await expect(service.update('user-1', updateUserDto, mockUserSecure)).rejects.toThrow(
        'Failed to update user'
      );
    });
  });

  describe('remove', () => {
    it('should remove user successfully', async () => {
      userRepository.findUnique.mockResolvedValue(mockUserWithOrders);
      userRepository.delete.mockResolvedValue(mockUser);
      redisClient.keys.mockResolvedValue(['users:cache1']);
      redisClient.del.mockResolvedValue(1);

      const result = await service.remove('user-1');

      expect(userRepository.delete).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
      expect(redisClient.keys).toHaveBeenCalledWith('users:*');
      expect(redisClient.del).toHaveBeenCalledWith(['users:cache1']);
      expect(result).toEqual(mockUser);
    });

    it('should throw UnprocessableEntityException when repository fails', async () => {
      userRepository.findUnique.mockResolvedValue(mockUserWithOrders);
      userRepository.delete.mockRejectedValue(new Error('Database error'));

      await expect(service.remove('user-1')).rejects.toThrow(
        UnprocessableEntityException
      );
      await expect(service.remove('user-1')).rejects.toThrow(
        'Failed to remove user.'
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty search terms in findAll', async () => {
      const emptySearchDto: GetUsersDto = {
        searchText: '   ',
      };

      const mockPaginatedResult = {
        data: [mockUser],
        meta: {
          total: 1,
          lastPage: 1,
          currentPage: 1,
          perPage: 10,
          prev: null,
          next: null,
        },
      };

      userRepository.findMany = jest.fn().mockResolvedValue([mockUser]);
      userRepository.count = jest.fn().mockResolvedValue(1);

      const result = await service.findAll(emptySearchDto, 1, 10);

      expect(result).toBeDefined();
    });

    it('should handle special characters in search', async () => {
      const specialSearchDto: GetUsersDto = {
        searchText: 'john@doe.com',
      };

      const mockPaginatedResult = {
        data: [mockUser],
        meta: {
          total: 1,
          lastPage: 1,
          currentPage: 1,
          perPage: 10,
          prev: null,
          next: null,
        },
      };

      userRepository.findMany = jest.fn().mockResolvedValue([mockUser]);
      userRepository.count = jest.fn().mockResolvedValue(1);

      const result = await service.findAll(specialSearchDto, 1, 10);

      expect(result).toBeDefined();
    });
  });
});