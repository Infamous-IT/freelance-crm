import { Injectable, NotFoundException } from '@nestjs/common';
import { disconnect } from 'process';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCustomerDto } from '../dto/create-customer.dto';
import { UpdateCustomerDto } from '../dto/update-customer.dto';

@Injectable()
export class CustomerService {
  constructor(private readonly prisma: PrismaService) {}

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

    return updatedCustomer;
  }

  async findAll(page: number = 1) {
    const take = 20;
    const skip = (page - 1) * take;

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

    return {
      data: custmers,
      totalCount,
      totalPages: Math.ceil(totalCount / take),
      currentPage: page,
    }
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
    });

    if(!customer) {
      throw new NotFoundException(`Customer with id ${id} was not found.`)
    }

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

    return `Customer with id ${id} was delete.`;
  }
}
