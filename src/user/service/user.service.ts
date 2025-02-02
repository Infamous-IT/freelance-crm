import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { User } from '@prisma/client';


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

  async findAll() {
    return this.prisma.user.findMany();
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
