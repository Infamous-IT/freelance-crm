import { ForbiddenException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { Prisma, Role, User } from '@prisma/client';
import { RedisClientType } from 'redis';
import logger from 'src/common/logger/logger';
import { PaginatedUsers } from 'src/modules/user/interfaces/user.interface';
import {
  userWithOrderIncludes,
  UserWithOrderIncludesType,
} from '../types/user-prisma-types.interface';
import { UserRepository } from '../repository/user.repository';
import { paginate } from 'src/common/pagination/paginator';
import { GetUsersDto } from '../dto/get-users.dto';
import { UserResponse } from '../responses/user.response';
import { UserSecure } from '../entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    @Inject('REDIS_CLIENT') private readonly redis: RedisClientType,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserResponse> {
    try {
      const user = await this.userRepository.create({
        data: {
          ...createUserDto,
        },
      });
      await this.clearCache();

      logger.info(`User created: ${user.id} - ${user.email}`);
      return user;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(`Error when we creating user: ${errorMessage}`);
      throw new UnprocessableEntityException('Failed to creating user');
    }
  }

  async findAll(
    param: GetUsersDto,
    page: number,
    perPage: number
  ): Promise<PaginatedUsers> {
    const { searchText, orderBy, role, country } = param;
  
    const terms = searchText ?
      searchText
        .trim()
        .split(/\s+/)
        .filter(term => term.length > 0) : null;
  
    const orConditions: Prisma.UserWhereInput[] | null = terms ? terms.flatMap(term => [
      {
        firstName: {
          contains: term, mode: 'insensitive'
        }
      },
      {
        lastName: {
          contains: term, mode: 'insensitive'
        }
      },
      {
        email: {
          contains: term, mode: 'insensitive'
        }
      }
    ]) : null;
  
    try {
      const users = await paginate(
        this.userRepository,
        {
          where: {
            ...(searchText && {
              OR: orConditions
            }),
            ...(role && { role }),
            ...(country && {
              country: {
                contains: country, mode: 'insensitive'
              }
            })
          },
          ...(orderBy ? {
            orderBy: {
              [orderBy.field]: orderBy.sorting || 'asc'
            }
          } : {}),
          include: {
            orders: true
          }
        },
        {
          page,
          perPage
        }
      );
  
      return {
        data: users.data as User[],
        totalCount: users.meta.total,
        totalPages: users.meta.lastPage,
        currentPage: users.meta.currentPage,
      };
    } catch (err: unknown) {
      throw new UnprocessableEntityException('Failed to get list of users');
    }
  }

  async clearCache(): Promise<void> {
    const keys = await this.redis.keys('users:*');
    if (keys.length > 0) {
      await this.redis.del(keys);
      logger.info('Cache cleared for users.');
    }
  }

  async findOneOrThrow(id: string): Promise<UserWithOrderIncludesType> {
    const user = await this.userRepository.findUnique({
      where: { id },
      ...userWithOrderIncludes,
    });
    
    if (!user) {
      logger.warn(`User with ID ${id} not found`);
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    
    return user as UserWithOrderIncludesType;
  }

  async getUserOrderWithUser(
    userId: string,
  ): Promise<UserWithOrderIncludesType | null> {
    try {
      logger.info(
        `Received request to get user with orders for user ID: ${userId}`,
      );
      const userWithOrders = await this.userRepository.findUnique({
        where: {
          id: userId,
        },
        ...userWithOrderIncludes,
      });

      return userWithOrders;
    } catch (err: unknown) {
      throw new UnprocessableEntityException('Failed to get user with order info');
    }
  }

  async findByEmail(email: string): Promise<UserResponse | null> {
    try {
      return await this.userRepository.findUnique({ where: { email } });
    } catch (err: unknown) {
      throw new NotFoundException('Not found email');
    }
  }

  async update(
    id: string, 
    updateUserDto: UpdateUserDto,
    currentUser: UserSecure
  ): Promise<UserResponse> {
    const existingUser = await this.findOneOrThrow(id);

    if (currentUser.role !== Role.ADMIN && currentUser.id !== id) {
      throw new ForbiddenException('Ви можете оновлювати тільки свій профіль');
    }
    
    try {
      const user = await this.userRepository.update({
        where: { id: existingUser.id },
        data: updateUserDto,
      });
      await this.clearCache();
      logger.info(`User updated: ${user.id} - ${user.email}`);
      return user;
    } catch (err: unknown) {
      throw new UnprocessableEntityException('Failed to update user');
    }
  }

  async remove(id: string): Promise<UserResponse> {
    const existingUser = await this.findOneOrThrow(id);
    try {
      const user = await this.userRepository.delete({
        where: { id: existingUser.id },
      });
      await this.clearCache();
      logger.info(`User removed: ${user.id} - ${user.email}`);
      return user;
    } catch (err: unknown) {
      throw new UnprocessableEntityException('Failed to remove user.');
    }
  }
}
