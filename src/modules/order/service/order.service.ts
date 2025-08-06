import { OrderRepository } from './../repository/order.repository';
import { ForbiddenException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { RedisClientType } from 'redis';
import { CreateOrderDto } from '../dto/create-order.dto';
import { UpdateOrderDto } from '../dto/update-order.dto';
import logger from 'src/common/logger/logger';
import { Prisma, Role } from '@prisma/client';
import { PaginatedOrders } from 'src/modules/order/interfaces/order.interface';
import {
  OrderWithRelationIncludes,
  orderWithRelationIncludes
} from '../types/order-prisma-types.interface';
import { paginate } from 'src/common/pagination/paginator';
import { OrderQueryDto } from '../dto/order-query.dto';
import { OrderQuerySearchParamsDto } from '../dto/order-query-search-params.dto';
import { OrderResponse } from '../responses/order.response';

@Injectable()
export class OrderService {
  constructor(
    private readonly orderRepository: OrderRepository,
    @Inject('REDIS_CLIENT') private readonly redis: RedisClientType,
  ) {}

  async create(createOrderDto: CreateOrderDto, userId: string): Promise<OrderResponse> {
    try {
      const { startDate, endDate, ...otherFields } = createOrderDto;
      const formattedStartDate = this.convertDateToISO(startDate);
      const formattedEndDate = this.convertDateToISO(endDate);

      logger.info(
        `Creating new order with startDate: ${formattedStartDate} and endDate: ${formattedEndDate}`,
      );

      const order = await this.orderRepository.create({
        data: {
          ...otherFields,
          userId,
          startDate: formattedStartDate,
          endDate: formattedEndDate,
        },
      });

      await this.clearCache();
      logger.info(`Order created successfully with ID: ${order.id}`);
      return order;
    } catch ( err: unknown ) {
      throw new UnprocessableEntityException( 'Failed to create order' );
    }
  }

  async findAll(
    param: OrderQuerySearchParamsDto,
    page: number,
    perPage: number,
    orderQueryDto: OrderQueryDto
  ): Promise<PaginatedOrders> {
    const { searchText, category, status, orderBy } = param;
    const { userId, userRole } = orderQueryDto;
  
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
            ...(userRole !== Role.ADMIN && { userId })
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
        data: orders.data as OrderResponse[],
        totalCount: orders.meta.total,
        totalPages: orders.meta.lastPage,
        currentPage: orders.meta.currentPage,
      };
    } catch (err: unknown) {
      throw new UnprocessableEntityException();
    }
  }

  async findOne(id: string, userId: string, userRole: Role): Promise<OrderWithRelationIncludes> {
    logger.info(`Fetching order with ID: ${id}`);
    const order = await this.orderRepository.findUnique({
      where: { id },
      ...orderWithRelationIncludes,
    });
  
    if (!order) {
      logger.warn(`Order with ID ${id} not found`);
      throw new NotFoundException(`Замовлення з ID ${id} не знайдено`);
    }
  
    if (userRole !== Role.ADMIN && order.userId !== userId) {
      logger.warn(`User ${userId} tried to access order ${id} owned by user ${order.userId}`);
      throw new ForbiddenException('Ви не маєте доступу до цього замовлення');
    }
  
    logger.info(`Order fetched with ID: ${id}`);
    return order;
  }

  async update(
    id: string,
    updateOrderDto: UpdateOrderDto,
    userRole: Role,
    currentUserId: string
  ): Promise<OrderResponse> {
    const order = await this.orderRepository.findUnique({
      where: { id },
    });

    if (!order) {
      logger.error(`Order not found for ID: ${id}`);
      throw new ForbiddenException(
        'Замовлення з таким ідентифікатором не знайдено!',
      );
    }

    if (userRole !== Role.ADMIN && order.userId !== currentUserId) {
      logger.error(
        `User with ID: ${currentUserId} tried to update another user's order with ID: ${id}`,
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

  async remove(id: string, userId: string, userRole: Role): Promise<OrderResponse> {
    const order = await this.orderRepository.findUnique({
      where: { id },
    });

    if (!order) {
      logger.error(`Order not found for deletion with ID: ${id}`);
      throw new ForbiddenException(
        'Замовлення з таким ідентифікатором не знайдено!',
      );
    }

    if (userRole !== Role.ADMIN && order.userId !== userId) {
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
