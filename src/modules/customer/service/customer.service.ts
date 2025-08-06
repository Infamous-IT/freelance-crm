import { ForbiddenException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { RedisClientType } from 'redis';
import { CreateCustomerDto } from '../dto/create-customer.dto';
import { UpdateCustomerDto } from '../dto/update-customer.dto';
import logger from 'src/common/logger/logger';
import { Prisma, Role } from '@prisma/client';
import {
  PaginatedResult,
} from 'src/modules/customer/interfaces/customer.interface';
import {
  CustomerWithOrderIncludes,
  customerWithOrderIncludes,
} from '../types/customer-prisma-types.interface';
import { CustomerRepository } from '../repository/customer.repository';
import { paginate } from 'src/common/pagination/paginator';
import { GetCustomersDto } from '../dto/get-customers.dto';
import { DatabaseService } from 'src/database/service/database.service';
import { CustomerResponse } from '../responses/customer.response';
import { UserSecure } from 'src/modules/user/entities/user.entity';

@Injectable()
export class CustomerService {
  constructor(
    private readonly customerRepository: CustomerRepository,
    private readonly databaseService: DatabaseService,
    @Inject('REDIS_CLIENT') private readonly redis: RedisClientType,
  ) {}

  async create( createCustomerDto: CreateCustomerDto, currentUser: UserSecure ): Promise<CustomerResponse> {
    const { orderIds, ...customerData } = createCustomerDto;

    try {
      logger.info('Received request to create a new customer');
      const customer = await this.customerRepository.create({
        data: {
          ...customerData,
          order: orderIds
            ? {
                connect: orderIds.map((orderId) => ({ id: orderId })),
              }
            : undefined,
        },
      });
  
      await this.clearCache();
      logger.info('New customer created successfully');
      return customer;
    } catch (err: unknown) {
      throw new UnprocessableEntityException('Failed to create customer');
    }
  }

  async addOrdersToCustomer(
    customerId: string,
    orderIds: string[],
    currentUser: UserSecure
  ): Promise<CustomerResponse> {
    logger.info(`Received request to add orders to customer with ID: ${customerId}`);

    const customer = await this.customerRepository.findUnique({
      where: { id: customerId },
      include: { order: true }
    });

    if (!customer) {
      throw new NotFoundException(`Customer with id ${customerId} was not found.`);
    }

    if (currentUser.role !== Role.ADMIN) {
      const userOrders = await this.databaseService.order.findMany({
        where: {
          id: { in: orderIds },
          userId: currentUser.id
        }
      });

      if (userOrders.length !== orderIds.length) {
        throw new ForbiddenException('You can add only own orders!');
      }
    }

    const existingOrders = await this.databaseService.order.findMany({
      where: {
        id: { in: orderIds },
        customers: { some: {} },
      },
    });

    if (existingOrders.length > 0) {
      logger.error('Some orders are already assigned to a customer');
      throw new Error(`Some orders are already assigned to a customer`);
    }

    try {
      const updatedCustomer = await this.customerRepository.update({
        where: { id: customerId },
        data: {
          order: {
            connect: orderIds.map((orderId) => ({ id: orderId })),
          },
        },
      });
  
      await this.clearCache();
      logger.info(`Orders successfully added to customer with ID: ${customerId}`);
      return updatedCustomer;
    } catch (err: unknown) {
      throw new UnprocessableEntityException('Failed to adding order to customer');
    }
  }

  async findAll(
    param: GetCustomersDto,
    page: number,
    perPage: number,
    currentUser: UserSecure
  ): Promise<PaginatedResult<CustomerResponse>> {
    const { searchText, orderBy, company } = param;
  
    const terms = searchText ?
      searchText
        .trim()
        .split(/\s+/)
        .filter(term => term.length > 0) : null;
  
    const orConditions: Prisma.CustomerWhereInput[] | null = terms ? terms.flatMap(term => [
      {
        fullName: {
          contains: term, mode: 'insensitive'
        }
      },
      {
        email: {
          contains: term, mode: 'insensitive'
        }
      },
      {
        company: {
          contains: term, mode: 'insensitive'
        }
      }
    ]) : null;
  
    try {
      const customers = await paginate(
        this.customerRepository,
        {
          where: {
            ...(searchText && {
              OR: orConditions
            }),
            ...(company && {
              company: {
                contains: company, mode: 'insensitive'
              }
            }),
            ...(currentUser.role !== Role.ADMIN && {
              order: {
                some: {
                  userId: currentUser.id
                }
              }
            })
          },
          ...(orderBy ? {
            orderBy: {
              [orderBy.field]: orderBy.sorting || 'asc'
            }
          } : {}),
          include: {
            order: true
          }
        },
        {
          page,
          perPage
        }
      );
  
      return {
        data: customers.data as CustomerResponse[],
        totalCount: customers.meta.total,
        totalPages: customers.meta.lastPage,
        currentPage: customers.meta.currentPage,
      };
    } catch (err: unknown) {
      throw new UnprocessableEntityException('Failed to getting customer list');
    }
  }

  async findOne(id: string, currentUser: UserSecure): Promise<CustomerResponse> {
    const cacheKey = `customer:${id}`;
    logger.info(`Fetching customer with ID: ${id}`);

    const cachedData = await this.redis.get(cacheKey);
    if (cachedData) {
      logger.info('Cache hit for customer');
      const customer = JSON.parse(cachedData);
      
      if (currentUser.role !== Role.ADMIN) {
        const hasAccess = customer.order?.some((order: any) => order.userId === currentUser.id);
        if (!hasAccess) {
          throw new ForbiddenException('Ви не маєте доступу до цього замовника');
        }
      }
      
      return customer;
    }

    const customer = await this.customerRepository.findUnique({
      where: { id },
      ...customerWithOrderIncludes,
    });

    if (!customer) {
      logger.error(`Customer with ID ${id} not found`);
      throw new NotFoundException(`Customer with id ${id} was not found.`);
    }

    if (currentUser.role !== Role.ADMIN) {
      const hasAccess = customer.order?.some((order: any) => order.userId === currentUser.id);
      if (!hasAccess) {
        throw new ForbiddenException('Ви не маєте доступу до цього замовника');
      }
    }

    await this.redis.set(
      cacheKey,
      JSON.stringify({ ...customer, order: customer.order || [] }),
      { EX: 300 },
    );
    logger.info(`Fetched customer with ID: ${id}`);
    return customer;
  }

  async update(
    id: string,
    updateCustomerDto: UpdateCustomerDto,
    currentUser: UserSecure
  ): Promise<CustomerResponse> {
    logger.info(`Received request to update customer with ID: ${id}`);
    const existingCustomer = await this.customerRepository.findUnique({
      where: { id },
      include: { order: true }
    });

    if (!existingCustomer) {
      logger.error(`Customer with ID ${id} not found`);
      throw new NotFoundException(`Customer with id ${id} was not found.`);
    }

    if (currentUser.role !== Role.ADMIN) {
      const hasAccess = existingCustomer.order?.some((order: any) => order.userId === currentUser.id);
      if (!hasAccess) {
        throw new ForbiddenException('You can update information for only own customers');
      }
    }

    try {
      const updatedCustomer = await this.customerRepository.update({
        where: { id },
        data: updateCustomerDto,
      });

      await this.clearCache();
      logger.info(`Customer with ID: ${id} updated successfully`);
      return updatedCustomer;
    } catch (err: unknown) {
      throw new UnprocessableEntityException('Failed to update customer');
    }
  }

  async remove(id: string, currentUser: UserSecure): Promise<CustomerResponse> {
    logger.info(`Received request to delete customer with ID: ${id}`);
    const existingCustomer = await this.customerRepository.findUnique({
      where: { id },
      include: { order: true }
    });
  
    if (!existingCustomer) {
      logger.error(`Customer with ID ${id} not found`);
      throw new NotFoundException(`Customer with id ${id} was not found.`);
    }
  
    if (currentUser.role !== Role.ADMIN) {
      const hasAccess = existingCustomer.order?.some((order: any) => order.userId === currentUser.id);
      if (!hasAccess) {
        throw new ForbiddenException('You can remove only own customers');
      }
    }
  
    try {
      const deletedCustomer = await this.customerRepository.delete({
        where: { id },
      });
  
      await this.clearCache();
      logger.info(`Customer with ID: ${id} deleted successfully`);
      return deletedCustomer as CustomerResponse;
    } catch (err: unknown) {
      throw new UnprocessableEntityException('Failed to remove customer');
    }
  }

  private async clearCache(): Promise<void> {
    logger.info('Clearing customer cache');
    const keys = await this.redis.keys('customers:*');
    if (keys.length > 0) {
      await this.redis.del(keys);
      logger.info('Cache cleared');
    }
  }
}
