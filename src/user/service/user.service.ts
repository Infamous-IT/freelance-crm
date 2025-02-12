import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { Prisma, User } from '@prisma/client';
import { RedisClientType } from 'redis';
import logger from 'src/logger/logger';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('REDIS_CLIENT') private readonly redis: RedisClientType,
    ){}

  async create(createUserDto: CreateUserDto) {
    try {
      const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword,
      },
    });
    await this.clearCache();

    logger.info(`User created: ${user.id} - ${user.email}`);
    return user;
    } catch (error) {
      logger.error(`Error when we creating user: ${error.message}`);
      throw error;
    };
  }

  async findAll(
    page: number = 1,
    pageSize: number = 20,
    sortBy: string = 'email',
    sortOrder: 'asc' | 'desc' = 'asc',
    filterDto?: { email?: string; firstName?: string; lastName?: string; country?: string }
  ) {
    const cacheKey = `users:page=${page}:size=${pageSize}:sortBy=${sortBy}:order=${sortOrder}:filters=${JSON.stringify(filterDto)}`;
    const cachedData = await this.redis.get(cacheKey);
    if(cachedData) {
      logger.info(`Cache hit for key: ${cacheKey}`);
      return JSON.parse(cachedData);
    }

    pageSize = parseInt(String(pageSize), 10);
    const skip = (page - 1) * pageSize;
  
    const { email, firstName, lastName, country } = filterDto || {};
  
    const where: Prisma.UserWhereInput = {
      ...(email ? { email: { contains: email, mode: 'insensitive' } } : {}),
      ...(firstName ? { firstName: { contains: firstName, mode: 'insensitive' } } : {}),
      ...(lastName ? { lastName: { contains: lastName, mode: 'insensitive' } } : {}),
      ...(country ? { country: { contains: country, mode: 'insensitive' } } : {}),
    };
  
    const orderBy = { [sortBy]: sortOrder };

    const [users, totalCount] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
      }),
      this.prisma.user.count({ where }),
    ]);

    const result = {
      data: users,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
      currentPage: page,
    };

    await this.redis.set(cacheKey, JSON.stringify(result), { EX: 300 });
    logger.info(`Found ${users.length} users for page ${page} with size ${pageSize}`);

    return result;
  }

  async clearCache() {
    const keys = await this.redis.keys('users:*');
    if (keys.length > 0) {
      await this.redis.del(keys);
      logger.info('Cache cleared for users.');
    }
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        orders: true,
      }
    });
    if (!user) {
      logger.warn(`User with ID ${id} not found`);
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    logger.info(`User found: ${user.id} - ${user.email}`);
    return user;
  }

  async getUserOrderWithUser(userId: string) {
    logger.info(`Received request to get user with orders for user ID: ${userId}`);
    const userWithOrders = await this.prisma.user.findUnique({
      where: { 
        id: userId
       },
      include: {
        orders: true
      },
    });

    if (userWithOrders) {
      logger.info(`Found user with ID: ${userId} and ${userWithOrders.orders.length} orders`);
    } else {
      logger.warn(`User with ID: ${userId} not found`);
    }
    
    return userWithOrders;
  }

  async getUserOrderWithCustomers(userId: string) {
    logger.info(`Received request to get orders with customers for user ID: ${userId}`);
    const orders = await this.prisma.order.findMany({
      where: { userId },
      include: {
        customers: true
      }
    });
  
    logger.info(`Found ${orders.length} orders for user ID: ${userId}`);
    return orders;
  }

  async getUserCustomerStats(userId: string) {
    logger.info(`Received request to get customer stats for user ID: ${userId}`);
    const orders = await this.prisma.order.findMany({
      where: { userId },
      include: { customers: true },
    });

    const uniqueCustomers = new Set(
      orders.flatMap(order => order.customers?.map(customer => customer.id)).filter(id => id != null)
    );
    logger.info(`Found ${uniqueCustomers.size} unique customers for user ID: ${userId}`);
    return uniqueCustomers.size;
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.prisma.user.findUnique({ where: { email } });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const existingUser = await this.prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      logger.warn(`User with ID ${id} not found for update`);
      throw new NotFoundException(`Користувача з ID ${id} не знайдено`);
    }
    const user = await this.prisma.user.update({
      where: { id },
      data: updateUserDto,
    });
    await this.clearCache();
    logger.info(`User updated: ${user.id} - ${user.email}`);
    return user;
  }

  async remove(id: string) {
    const user = await this.prisma.user.delete({
      where: { id },
    });
    await this.clearCache();
    logger.info(`User removed: ${user.id} - ${user.email}`);
    return user;
  }
}
