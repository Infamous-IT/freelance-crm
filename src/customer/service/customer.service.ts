import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { RedisClientType } from 'redis';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCustomerDto } from '../dto/create-customer.dto';
import { UpdateCustomerDto } from '../dto/update-customer.dto';

@Injectable()
export class CustomerService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('REDIS_CLIENT') private readonly redis: RedisClientType,
    ) {}

  async create(createCustomerDto: CreateCustomerDto) {
    const { orderIds, ...customerData } = createCustomerDto;

    const customer = await this.prisma.customer.create({
      data: {
        ...customerData,
        order: orderIds 
          ? {
              connect: orderIds.map(orderId => ({ id: orderId })),
          }
          : undefined,
      },
    })
    
    await this.clearCache();

    return customer;
  }

  async addOrdersToCustomer(customerId: string, orderIds: string[]) {
   const existingOrders = await this.prisma.order.findMany({
    where: {
      id: { in: orderIds },
      customers: { some: {} }
    }
   })

   if (existingOrders.length > 0) {
    throw new Error(`Some orders are already assigned to a customer`);
  }

   const updatedCustomer = await this.prisma.customer.update({
      where: { id: customerId },
      data: {
        order: {
          connect: orderIds.map(orderId => ({ id: orderId })),
        },
      },
    });

    await this.clearCache();

    return updatedCustomer;
  }

  async findAll(page: number = 1) {
    const take = 20;
    page = parseInt(String(page), 10);
    const skip = (page - 1) * take;
    const cacheKey = `customers:page${page}:size=${take}`;

    const cachedData = await this.redis.get(cacheKey);
    if(cachedData) {
      return JSON.parse(cachedData);
    }

    const [custmers, totalCount] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        skip,
        take,
        include: {
          order: true
        }
      }),
      this.prisma.customer.count(),
    ]);

    const result = {
      data: custmers,
      totalCount,
      totalPages: Math.ceil(totalCount / take),
      currentPage: page,
    }

    await this.redis.set(cacheKey, JSON.stringify(result), { EX: 300 });

    return result;
  }

  async findOne(id: string) {
    const cacheKey = `customer:${id}`;
    const cachedData = await this.redis.get(cacheKey);
    if (cachedData) {
      return JSON.parse(cachedData);
    }

    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: { 
        order: true, 
      },
    });

    if(!customer) {
      throw new NotFoundException(`Customer with id ${id} was not found.`)
    }

    await this.redis.set(cacheKey, JSON.stringify({ ...customer, order: customer.order || [] }), { EX: 300 });

    return customer;
  }

  async update(id: string, updateCustomerDto: UpdateCustomerDto) {
    const existingCustomer = await this.prisma.customer.findUnique({
      where: { id },
    });

    if(!existingCustomer) {
      throw new NotFoundException(`Customer with id ${id} was not found.`)
    }

    const updatedCustomer = await this.prisma.customer.update({
      where: { id },
      data: updateCustomerDto,
    });

    await this.clearCache();

    return updatedCustomer; 
  }

  async remove(id: string) {
    const existingCustomer = await this.prisma.customer.findUnique({
      where: { id },
    });

    
    if(!existingCustomer) {
      throw new NotFoundException(`Customer with id ${id} was not found.`)
    }

    const deletedCustomer = await this.prisma.customer.delete({
      where: { id },
    });

    await this.clearCache();

    return `Customer with id ${id} was delete.`;
  }

  async getUserCustomerStats(requestingUserId: string, isAdmin: boolean) {
    const stats = await this.prisma.customer.aggregate({
      where: isAdmin ? {} : { order: { some: { userId: requestingUserId } } },
      _count: { id: true },
    });

    return {
      totalCustomers: stats._count.id
    };
  }

  async getCustomerSpending(requestingUserId: string, isAdmin: boolean) {
    const customers = await this.prisma.customer.findMany({
      where: isAdmin ? {} : { order: { some: { userId: requestingUserId } } },
      select: {
        id: true,
        fullName: true,
        order: {
          select: { price: true },
        },
      },
    });

    return customers.map(customer => ({
      id: customer.id,
      fullName: customer.fullName,
      totalSpending: customer.order.reduce((sum, order) => sum + order.price.toNumber(), 0)
    }))
  }

  async getTopCustomersByOrders(userId: string, isAdmin: boolean, limit: number = 5) {
    return await this.prisma.customer.findMany({
      where: isAdmin ? {} : { order: { some: { userId } } },
      orderBy: { order: { _count: 'desc' } },
      take: limit,
      select: { id: true, fullName: true, _count: { select: { order: true } } },
    });
  }

  async getTopCustomersBySpending(requestingUserId: string, isAdmin: boolean, limit: number = 5) {
    const spendingData = await this.prisma.order.findMany({
      where: isAdmin ? {} : { userId: requestingUserId },
      select: {
        price: true,
        customers: {
          select: { id: true },
        },
      },
    });
  
    const customerSpendingMap = new Map<string, number>();
  
    spendingData.forEach(order => {
      order.customers.forEach(customer => {
        const prevSpending = customerSpendingMap.get(customer.id) || 0;
        customerSpendingMap.set(customer.id, prevSpending + Number(order.price));
      });
    });
  
    const topCustomerIds = [...customerSpendingMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([customerId]) => customerId);
  
    const customers = await this.prisma.customer.findMany({
      where: { id: { in: topCustomerIds } },
      select: {
        id: true,
        fullName: true,
        email: true,
      },
    });
  
    return customers.map(customer => ({
      id: customer.id,
      fullName: customer.fullName,
      email: customer.email,
      totalSpending: customerSpendingMap.get(customer.id) || 0,
    }));
  }
  
  
  
  
  private async clearCache() {
    const keys = await this.redis.keys('customers:*');
    if (keys.length > 0) {
      await this.redis.del(keys);
    }
  }
}
