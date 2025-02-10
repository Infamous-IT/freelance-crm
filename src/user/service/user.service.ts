import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { Prisma, User } from '@prisma/client';


@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService){}

  async create(createUserDto: CreateUserDto) {
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword,
      },
    });
    return user;
  }

  async findAll(
    page: number = 1,
    pageSize: number = 20,
    sortBy: string = 'email',
    sortOrder: 'asc' | 'desc' = 'asc',
    filterDto?: { email?: string; firstName?: string; lastName?: string; country?: string } // Додаткові фільтри
  ) {
    const skip = (page - 1) * pageSize;
  
    const { email, firstName, lastName, country } = filterDto || {};
  
    const where: Prisma.UserWhereInput = {
      ...(email ? { email: { contains: email, mode: 'insensitive' } } : {}),
      ...(firstName ? { firstName: { contains: firstName, mode: 'insensitive' } } : {}),
      ...(lastName ? { lastName: { contains: lastName, mode: 'insensitive' } } : {}),
      ...(country ? { country: { contains: country, mode: 'insensitive' } } : {}),
    };
  
    const orderBy = sortBy ? { [sortBy]: sortOrder } : undefined;

    const users = await this.prisma.user.findMany({
      where,
      skip,
      take: pageSize,
      orderBy,
    });

    const totalItems = await this.prisma.user.count({
      where,
    });
  
    return {
      data: users,
      totalItems,
      currentPage: page,
      totalPages: Math.ceil(totalItems / pageSize),
    };
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
    return user;
  }

  async remove(id: string) {
    const user = await this.prisma.user.delete({
      where: { id },
    });
    return user;
  }
}
