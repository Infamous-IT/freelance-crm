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
        order: true 
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

  private async clearCache() {
    const keys = await this.redis.keys('customers:*');
    if (keys.length > 0) {
      await this.redis.del(keys);
    }
  }
}
