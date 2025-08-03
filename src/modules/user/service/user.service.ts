import { Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { Prisma, User } from '@prisma/client';
import { RedisClientType } from 'redis';
import logger from 'src/common/logger/logger';
import { PaginatedUsers } from 'src/modules/user/interfaces/user.interface';
import {
  userWithOrderIncludes,
  UserWithOrderIncludesType,
} from '../types/user-prisma-types.interface';
import { UserRepository } from '../repository/user.repository';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { paginate } from 'src/common/pagination/paginator';
import { GetUsersDto } from '../dto/get-users.dto';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly prisma: PrismaService,
    @Inject('REDIS_CLIENT') private readonly redis: RedisClientType,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
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
      throw error;
    }
  }

  // TODO: used Prisma.validator and use types or dto for arguments
  // async findAll(
  //   page: number = 1,
  //   pageSize: number = 20,
  //   sortBy: keyof User = 'email',
  //   sortOrder: 'asc' | 'desc' = 'asc',
  //   filterDto?: Partial<
  //     Pick<User, 'email' | 'firstName' | 'lastName' | 'country'>
  //   >,
  // ): Promise<PaginatedUsers> {
  //   const cacheKey = `users:page=${page}:size=${pageSize}:sortBy=${sortBy}:order=${sortOrder}:filters=${JSON.stringify(filterDto)}`;
  //   const cachedData = await this.redis.get(cacheKey);
  //   if (cachedData) {
  //     logger.info(`Cache hit for key: ${cacheKey}`);
  //     return JSON.parse(cachedData) as PaginatedUsers;
  //   }

  //   pageSize = parseInt(String(pageSize), 10);
  //   const skip = (page - 1) * pageSize;

  //   const { email, firstName, lastName, country } = filterDto || {};

  //   const where: Prisma.UserWhereInput = {
  //     ...(email ? { email: { contains: email, mode: 'insensitive' } } : {}),
  //     ...(firstName
  //       ? { firstName: { contains: firstName, mode: 'insensitive' } }
  //       : {}),
  //     ...(lastName
  //       ? { lastName: { contains: lastName, mode: 'insensitive' } }
  //       : {}),
  //     ...(country
  //       ? { country: { contains: country, mode: 'insensitive' } }
  //       : {}),
  //   };

  //   const orderBy = { [sortBy]: sortOrder };

  //   const [users, totalCount] = await this.prisma.$transaction([
  //     this.prisma.user.findMany({
  //       where,
  //       skip,
  //       take: pageSize,
  //       orderBy,
  //     }),
  //     this.prisma.user.count({ where }),
  //   ]);

  //   const result = {
  //     data: users,
  //     totalCount,
  //     totalPages: Math.ceil(totalCount / pageSize),
  //     currentPage: page,
  //   };

  //   await this.redis.set(cacheKey, JSON.stringify(result), { EX: 300 });
  //   logger.info(
  //     `Found ${users.length} users for page ${page} with size ${pageSize}`,
  //   );

  //   return result;
  // }

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
      throw new UnprocessableEntityException();
    }
  }

  async clearCache(): Promise<void> {
    const keys = await this.redis.keys('users:*');
    if (keys.length > 0) {
      await this.redis.del(keys);
      logger.info('Cache cleared for users.');
    }
  }

  async findOne(id: string): Promise<UserWithOrderIncludesType> {
    const user = await this.userRepository.findUnique({
      where: { id },
      ...userWithOrderIncludes,
    });
    if (!user) {
      logger.warn(`User with ID ${id} not found`);
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    logger.info(`User found: ${user.id} - ${user.email}`);
    return user;
  }

  async getUserOrderWithUser(
    userId: string,
  ): Promise<UserWithOrderIncludesType | null> {
    logger.info(
      `Received request to get user with orders for user ID: ${userId}`,
    );
    const userWithOrders = await this.userRepository.findUnique({
      where: {
        id: userId,
      },
      ...userWithOrderIncludes,
    });

    if (userWithOrders) {
      logger.info(
        `Found user with ID: ${userId} and ${userWithOrders.orders.length} orders`,
      );
    } else {
      logger.warn(`User with ID: ${userId} not found`);
    }

    return userWithOrders;
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findUnique({ where: { email } });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const existingUser = await this.userRepository.findUnique({ where: { id } });
    if (!existingUser) {
      logger.warn(`User with ID ${id} not found for update`);
      throw new NotFoundException(`Користувача з ID ${id} не знайдено`);
    }
    const user = await this.userRepository.update({
      where: { id },
      data: updateUserDto,
    });
    await this.clearCache();
    logger.info(`User updated: ${user.id} - ${user.email}`);
    return user;
  }

  async remove(id: string): Promise<User> {
    const user = await this.userRepository.delete({
      where: { id },
    });
    await this.clearCache();
    logger.info(`User removed: ${user.id} - ${user.email}`);
    return user;
  }
}
