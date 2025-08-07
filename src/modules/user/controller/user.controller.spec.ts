import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from '../service/user.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { GetUsersDto } from '../dto/get-users.dto';
import { UserIdParamDto } from '../../../common/dtos/user-id-param.dto';
import { UserSecure } from '../entities/user.entity';
import { Role, User } from '@prisma/client';
import { PaginatedUsers } from '../interfaces/user.interface';
import { UserWithOrderIncludesType } from '../types/user-prisma-types.interface';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '../../../database/service/database.service';

jest.mock('../../../common/guards/user-auth.guard', () => ({
  AuthRolesGuard: jest.fn().mockImplementation(() => ({
    canActivate: jest.fn().mockReturnValue(true),
  })),
}));

jest.mock('../../../common/abstract/controller/abstract.controller', () => ({
  AbstractController: class MockAbstractController {
    transformToObject(data: any, type: any) {
      return { transformed: true, data, type: type.name };
    }
    transformToArray(data: any[], type: any) {
      return { transformed: true, data, type: type.name };
    }
  }
}));

describe('UserController', () => {
  let controller: UserController;
  let userService: jest.Mocked<UserService>;

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

  const mockCreateUserDto: CreateUserDto = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    password: 'password123',
    country: 'Ukraine',
    isEmailVerified: false,
    role: Role.FREELANCER,
  };

  const mockUpdateUserDto: UpdateUserDto = {
    firstName: 'Jane',
    lastName: 'Smith',
  };

  const mockGetUsersDto: GetUsersDto = {
    searchText: 'john',
    orderBy: { field: 'firstName', sorting: 'asc' },
    role: Role.FREELANCER,
    country: 'Ukraine',
  };

  const mockUserIdParamDto: UserIdParamDto = {
    userId: 'user-1',
  };

  beforeEach(async () => {
    const mockUserService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOneOrThrow: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const mockJwtService = {
      sign: jest.fn(),
      verify: jest.fn(),
    };

    const mockDatabaseService = {
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    userService = module.get(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create user successfully', async () => {
      userService.create.mockResolvedValue(mockUser);

      const result = await controller.create(mockCreateUserDto);

      expect(userService.create).toHaveBeenCalledWith(mockCreateUserDto);
      expect(result).toEqual({
        transformed: true,
        data: mockUser,
        type: 'UserResponse',
      });
    });

    it('should handle service error', async () => {
      const error = new Error('Service error');
      userService.create.mockRejectedValue(error);

      await expect(controller.create(mockCreateUserDto)).rejects.toThrow('Service error');
      expect(userService.create).toHaveBeenCalledWith(mockCreateUserDto);
    });
  });

  describe('getAllPaginated', () => {
    it('should return paginated users successfully', async () => {
      userService.findAll.mockResolvedValue(mockPaginatedUsers);

      const result = await controller.getAllPaginated(mockGetUsersDto, 1, 20);

      expect(userService.findAll).toHaveBeenCalledWith(mockGetUsersDto, 1, 20);
      expect(result).toEqual({
        transformed: true,
        data: mockPaginatedUsers.data,
        type: 'UserResponse',
      });
    });

    it('should use default pagination values', async () => {
      userService.findAll.mockResolvedValue(mockPaginatedUsers);

      const result = await controller.getAllPaginated(mockGetUsersDto);

      expect(userService.findAll).toHaveBeenCalledWith(mockGetUsersDto, 1, 20);
      expect(result).toEqual({
        transformed: true,
        data: mockPaginatedUsers.data,
        type: 'UserResponse',
      });
    });

    it('should handle service error', async () => {
      const error = new Error('Service error');
      userService.findAll.mockRejectedValue(error);

      await expect(controller.getAllPaginated(mockGetUsersDto, 1, 20)).rejects.toThrow('Service error');
      expect(userService.findAll).toHaveBeenCalledWith(mockGetUsersDto, 1, 20);
    });
  });

  describe('findOne', () => {
    it('should return user by ID successfully', async () => {
      userService.findOneOrThrow.mockResolvedValue(mockUserWithOrders);

      const result = await controller.findOne(mockUserIdParamDto);

      expect(userService.findOneOrThrow).toHaveBeenCalledWith(mockUserIdParamDto.userId);
      expect(result).toEqual({
        transformed: true,
        data: mockUserWithOrders,
        type: 'UserResponse',
      });
    });

    it('should handle service error', async () => {
      const error = new Error('User not found');
      userService.findOneOrThrow.mockRejectedValue(error);

      await expect(controller.findOne(mockUserIdParamDto)).rejects.toThrow('User not found');
      expect(userService.findOneOrThrow).toHaveBeenCalledWith(mockUserIdParamDto.userId);
    });
  });

  describe('update', () => {
    it('should update user successfully', async () => {
      const updatedUser = { ...mockUser, ...mockUpdateUserDto };
      userService.update.mockResolvedValue(updatedUser);

      const result = await controller.update(mockUserIdParamDto, mockUpdateUserDto, mockUserSecure);

      expect(userService.update).toHaveBeenCalledWith(
        mockUserIdParamDto.userId,
        mockUpdateUserDto,
        mockUserSecure
      );
      expect(result).toEqual({
        transformed: true,
        data: updatedUser,
        type: 'UserResponse',
      });
    });

    it('should handle service error', async () => {
      const error = new Error('Update failed');
      userService.update.mockRejectedValue(error);

      await expect(
        controller.update(mockUserIdParamDto, mockUpdateUserDto, mockUserSecure)
      ).rejects.toThrow('Update failed');
      expect(userService.update).toHaveBeenCalledWith(
        mockUserIdParamDto.userId,
        mockUpdateUserDto,
        mockUserSecure
      );
    });
  });

  describe('remove', () => {
    it('should remove user successfully', async () => {
      userService.remove.mockResolvedValue(mockUser);

      const result = await controller.remove(mockUserIdParamDto);

      expect(userService.remove).toHaveBeenCalledWith(mockUserIdParamDto.userId);
      expect(result).toEqual({
        transformed: true,
        data: mockUser,
        type: 'UserResponse',
      });
    });

    it('should handle service error', async () => {
      const error = new Error('Delete failed');
      userService.remove.mockRejectedValue(error);

      await expect(controller.remove(mockUserIdParamDto)).rejects.toThrow('Delete failed');
      expect(userService.remove).toHaveBeenCalledWith(mockUserIdParamDto.userId);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty search parameters in getAllPaginated', async () => {
      const emptyGetUsersDto: GetUsersDto = {};
      userService.findAll.mockResolvedValue(mockPaginatedUsers);

      const result = await controller.getAllPaginated(emptyGetUsersDto, 1, 20);

      expect(userService.findAll).toHaveBeenCalledWith(emptyGetUsersDto, 1, 20);
      expect(result).toBeDefined();
    });

    it('should handle null values in update', async () => {
      const nullUpdateDto: UpdateUserDto = {};
      const updatedUser = { ...mockUser };
      userService.update.mockResolvedValue(updatedUser);

      const result = await controller.update(mockUserIdParamDto, nullUpdateDto, mockUserSecure);

      expect(userService.update).toHaveBeenCalledWith(
        mockUserIdParamDto.userId,
        nullUpdateDto,
        mockUserSecure
      );
      expect(result).toBeDefined();
    });

    it('should handle special characters in search', async () => {
      const specialSearchDto: GetUsersDto = {
        searchText: 'john@doe.com',
      };
      userService.findAll.mockResolvedValue(mockPaginatedUsers);

      const result = await controller.getAllPaginated(specialSearchDto, 1, 20);

      expect(userService.findAll).toHaveBeenCalledWith(specialSearchDto, 1, 20);
      expect(result).toBeDefined();
    });
  });

  describe('DTO Validation', () => {
    it('should handle valid CreateUserDto', async () => {
      const validCreateDto: CreateUserDto = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        password: 'password123',
        country: 'Ukraine',
        role: Role.FREELANCER,
      };
      userService.create.mockResolvedValue(mockUser);

      const result = await controller.create(validCreateDto);

      expect(userService.create).toHaveBeenCalledWith(validCreateDto);
      expect(result).toBeDefined();
    });

    it('should handle valid UpdateUserDto', async () => {
      const validUpdateDto: UpdateUserDto = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
      };
      const updatedUser = { ...mockUser, ...validUpdateDto };
      userService.update.mockResolvedValue(updatedUser);

      const result = await controller.update(mockUserIdParamDto, validUpdateDto, mockUserSecure);

      expect(userService.update).toHaveBeenCalledWith(
        mockUserIdParamDto.userId,
        validUpdateDto,
        mockUserSecure
      );
      expect(result).toBeDefined();
    });

    it('should handle valid GetUsersDto', async () => {
      const validGetUsersDto: GetUsersDto = {
        searchText: 'john',
        orderBy: { field: 'firstName', sorting: 'asc' },
        role: Role.FREELANCER,
        country: 'Ukraine',
      };
      userService.findAll.mockResolvedValue(mockPaginatedUsers);

      const result = await controller.getAllPaginated(validGetUsersDto, 1, 20);

      expect(userService.findAll).toHaveBeenCalledWith(validGetUsersDto, 1, 20);
      expect(result).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle service throwing NotFoundException', async () => {
      const { NotFoundException } = await import('@nestjs/common');
      userService.findOneOrThrow.mockRejectedValue(new NotFoundException('User not found'));

      await expect(controller.findOne(mockUserIdParamDto)).rejects.toThrow(NotFoundException);
      expect(userService.findOneOrThrow).toHaveBeenCalledWith(mockUserIdParamDto.userId);
    });

    it('should handle service throwing UnprocessableEntityException', async () => {
      const { UnprocessableEntityException } = await import('@nestjs/common');
      userService.create.mockRejectedValue(new UnprocessableEntityException('Invalid data'));

      await expect(controller.create(mockCreateUserDto)).rejects.toThrow(UnprocessableEntityException);
      expect(userService.create).toHaveBeenCalledWith(mockCreateUserDto);
    });

    it('should handle service throwing ForbiddenException', async () => {
      const { ForbiddenException } = await import('@nestjs/common');
      userService.update.mockRejectedValue(new ForbiddenException('Access denied'));

      await expect(
        controller.update(mockUserIdParamDto, mockUpdateUserDto, mockUserSecure)
      ).rejects.toThrow(ForbiddenException);
      expect(userService.update).toHaveBeenCalledWith(
        mockUserIdParamDto.userId,
        mockUpdateUserDto,
        mockUserSecure
      );
    });
  });
});