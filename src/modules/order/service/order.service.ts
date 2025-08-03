import { OrderRepository } from './../repository/order.repository';
import { ForbiddenException, Inject, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { RedisClientType } from 'redis';
import { CreateOrderDto } from '../dto/create-order.dto';
import { UpdateOrderDto } from '../dto/update-order.dto';
import logger from 'src/common/logger/logger';
import { Order, Prisma } from '@prisma/client';
import { PaginatedOrders } from 'src/modules/order/interfaces/order.interface';
import {
  OrderWithRelationIncludes,
  orderWithRelationIncludes
} from '../types/order-prisma-types.interface';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { paginate } from 'src/common/pagination/paginator';
import { GetOrdersDto } from '../dto/get-orders.dto';

@Injectable()
export class OrderService {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly prisma: PrismaService,
    @Inject('REDIS_CLIENT') private readonly redis: RedisClientType,
  ) {}

  async create(createOrderDto: CreateOrderDto): Promise<Order> {
    const { startDate, endDate, ...otherFields } = createOrderDto;

    const formattedStartDate = this.convertDateToISO(startDate);
    const formattedEndDate = this.convertDateToISO(endDate);

    logger.info(
      `Creating new order with startDate: ${formattedStartDate} and endDate: ${formattedEndDate}`,
    );

    const order = await this.orderRepository.create({
      data: {
        ...otherFields,
        startDate: formattedStartDate,
        endDate: formattedEndDate,
      },
    });

    await this.clearCache();
    logger.info(`Order created successfully with ID: ${order.id}`);
    return order;
  }

  // TODO: used Prisma.validator
  // async findAll(page: number = 1): Promise<PaginatedOrders> {
  //   const take = 20;
  //   page = parseInt(String(page), 10);
  //   const skip = (page - 1) * take;

  //   const cacheKey = `orders:page=${page}:size=${take}`;
  //   const cachedData = await this.redis.get(cacheKey);

  //   if (cachedData) {
  //     logger.info(`Cache hit for orders on page ${page}`);
  //     return JSON.parse(cachedData);
  //   }

  //   logger.info(`Cache miss. Fetching orders from DB for page ${page}`);

  //   const [orders, totalCount] = await this.prisma.$transaction([
  //     this.prisma.order.findMany({
  //       skip,
  //       take,
  //       ...orderWithRelationIncludes,
  //     }),
  //     this.prisma.order.count(),
  //   ]);

  //   const result = {
  //     data: orders,
  //     totalCount,
  //     totalPages: Math.ceil(totalCount / take),
  //     currentPage: page,
  //   };

  //   await this.redis.set(cacheKey, JSON.stringify(result), { EX: 300 });

  //   logger.info(`Fetched orders for page ${page}, totalCount: ${totalCount}`);
  //   return result;
  // }
  async findAll(
    param: GetOrdersDto,
    page: number,
    perPage: number
  ): Promise<PaginatedOrders> {
    const { searchText, orderBy, category, status, userId } = param;
  
    const terms = searchText ?
      searchText
        .trim()
        .split(/\s+/)
        .filter(term => term.length > 0) : null;
  
    const orConditions: Prisma.OrderWhereInput[] | null = terms ? terms.flatMap(term => [
      {
        title: {
          contains: term, mode: 'insensitive'
        }
      },
      {
        description: {
          contains: term, mode: 'insensitive'
        }
      }
    ]) : null;
  
    try {
      const orders = await paginate(
        this.orderRepository,
        {
          where: {
            ...(searchText && {
              OR: orConditions
            }),
            ...(category && { category }),
            ...(status && { status }),
            ...(userId && { userId })
          },
          ...(orderBy ? {
            orderBy: {
              [orderBy.field]: orderBy.sorting || 'asc'
            }
          } : {}),
          include: {
            user: true,
            customers: true
          }
        },
        {
          page,
          perPage
        }
      );
  
      return {
        data: orders.data as Order[],
        totalCount: orders.meta.total,
        totalPages: orders.meta.lastPage,
        currentPage: orders.meta.currentPage,
      };
    } catch (err: unknown) {
      throw new UnprocessableEntityException();
    }
  }

  async findOne(id: string): Promise<OrderWithRelationIncludes | null> {
    logger.info(`Fetching order with ID: ${id}`);
    const order = await this.orderRepository.findUnique({
      where: { id },
      ...orderWithRelationIncludes,
    });
    logger.info(`Order fetched with ID: ${id}`);
    return order;
  }

  async update(
    id: string,
    userId: string,
    updateOrderDto: UpdateOrderDto,
  ): Promise<Order> {
    const order = await this.orderRepository.findUnique({
      where: { id },
    });

    if (!order) {
      logger.error(`Order not found for ID: ${id}`);
      throw new ForbiddenException(
        'Замовлення з таким ідентифікатором не знайдено!',
      );
    }

    if (order.userId !== userId) {
      logger.error(
        `User with ID: ${userId} tried to update another user's order with ID: ${id}`,
      );
      throw new ForbiddenException(
        'Ви не можете редагувати це замовлення, тому що ви не створювали його!',
      );
    }

    const { startDate, endDate, ...otherFields } = updateOrderDto;

    const dataToUpdate: any = {
      ...otherFields,
    };

    if (startDate) {
      dataToUpdate.startDate = this.convertDateToISO(startDate);
    }

    if (endDate) {
      dataToUpdate.endDate = this.convertDateToISO(endDate);
    }

    const updatedOrder = await this.orderRepository.update({
      where: { id },
      data: updateOrderDto,
    });

    await this.clearCache();
    logger.info(`Order updated successfully with ID: ${id}`);
    return updatedOrder;
  }

  async remove(id: string, userId: string): Promise<Order> {
    const order = await this.orderRepository.findUnique({
      where: { id },
    });

    if (!order) {
      logger.error(`Order not found for deletion with ID: ${id}`);
      throw new ForbiddenException(
        'Замовлення з таким ідентифікатором не знайдено!',
      );
    }

    if (order.userId !== userId) {
      logger.error(
        `User with ID: ${userId} tried to delete another user's order with ID: ${id}`,
      );
      throw new ForbiddenException(
        'Ви не можете видалити це замовлення, тому що ви не створювали його!',
      );
    }

    const deletedOrder = await this.orderRepository.delete({ where: { id } });

    await this.clearCache();
    logger.info(`Order deleted successfully with ID: ${id}`);
    return deletedOrder;
  }

  private convertDateToISO(date: string): string {
    const [day, month, year] = date.split('-').map(Number);
    const formattedDate = new Date(year, month - 1, day);
    return formattedDate.toISOString();
  }

  private async clearCache(): Promise<void> {
    logger.info('Clearing cache for orders');
    const keys = await this.redis.keys('orders:*');
    if (keys.length > 0) {
      await this.redis.del(keys);
      logger.info('Cache cleared for orders');
    }
  }
}
