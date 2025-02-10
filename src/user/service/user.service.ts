import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { Prisma, User } from '@prisma/client';
import { RedisClientType } from 'redis';
import { parse } from 'path';


@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('REDIS_CLIENT') private readonly redis: RedisClientType,
    ){}

  async create(createUserDto: CreateUserDto) {
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword,
      },
    });
    await this.clearCache();
    return user;
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
  
    return result;
  }

  async clearCache() {
    const keys = await this.redis.keys('users:*');
    if (keys.length > 0) {
      await this.redis.del(keys);
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
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async getUserOrderWithUser(userId: string) {
    const userWithOrders = await this.prisma.user.findUnique({
      where: { 
        id: userId
       },
      include: {
        orders: true
      },
    });
    
    return userWithOrders;
  }

  async getUserOrderWithCustomers(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: {
        customers: true
      }
    })
  }

  async getUserCustomerStats(userId: string) {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      include: { customers: true },
    });

    const uniqueCustomers = new Set(
      orders.flatMap(order => order.customers?.map(customer => customer.id)).filter(id => id != null)
    );
    return uniqueCustomers.size;
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.prisma.user.findUnique({ where: { email } });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const existingUser = await this.prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      throw new NotFoundException(`Користувача з ID ${id} не знайдено`);
    }
    const user = await this.prisma.user.update({
      where: { id },
      data: updateUserDto,
    });
    await this.clearCache();
    return user;
  }

  async remove(id: string) {
    const user = await this.prisma.user.delete({
      where: { id },
    });
    await this.clearCache();
    return user;
  }
}
