import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { RedisClientType } from 'redis';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateOrderDto } from '../dto/create-order.dto';
import { UpdateOrderDto } from '../dto/update-order.dto';
import logger from 'src/logger/logger';
import { Order } from '@prisma/client';
import { OrderStats, PaginatedOrders, TopExpensiveOrder } from 'src/interfaces/paginated.order.interface';

@Injectable()
export class OrderService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('REDIS_CLIENT') private readonly redis: RedisClientType,
    ) {}

  async create(createOrderDto: CreateOrderDto): Promise<Order> {
    const { startDate, endDate, ...otherFields } = createOrderDto;

    const formattedStartDate = this.convertDateToISO(startDate);
    const formattedEndDate = this.convertDateToISO(endDate);

    logger.info(`Creating new order with startDate: ${formattedStartDate} and endDate: ${formattedEndDate}`);

    const order = await this.prisma.order.create({
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

  async findAll(page: number = 1): Promise<PaginatedOrders> {
    const take = 20;
    page = parseInt(String(page), 10);
    const skip = (page - 1) * take;

    const cacheKey = `orders:page=${page}:size=${take}`;
    const cachedData = await this.redis.get(cacheKey);

    if (cachedData) {
      logger.info(`Cache hit for orders on page ${page}`);
      return JSON.parse(cachedData);
    }
    
    logger.info(`Cache miss. Fetching orders from DB for page ${page}`);

    const [orders, totalCount] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        skip,
        take,
        include: { customers: true, user: true },
      }),
      this.prisma.order.count(),
    ]);

    const result = {
      data: orders,
      totalCount,
      totalPages: Math.ceil(totalCount / take),
      currentPage: page,
    };

    await this.redis.set(cacheKey, JSON.stringify(result), { EX: 300 });

    logger.info(`Fetched orders for page ${page}, totalCount: ${totalCount}`);
    return result;
  }

  async findOne(id: string): Promise<Order | null> {
    logger.info(`Fetching order with ID: ${id}`);
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { customers: true, user: true },
    });
    logger.info(`Order fetched with ID: ${id}`);
    return order;
  }

  async update(id: string, userId: string, updateOrderDto: UpdateOrderDto): Promise<Order> {
    const order = await this.prisma.order.findUnique({
      where: { id },
    });

    if(!order) {
      logger.error(`Order not found for ID: ${id}`);
      throw new ForbiddenException('Замовлення з таким ідентифікатором не знайдено!');
    }

    if(order.userId !== userId) {
      logger.error(`User with ID: ${userId} tried to update another user's order with ID: ${id}`);
      throw new ForbiddenException('Ви не можете редагувати це замовлення, тому що ви не створювали його!');
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

    const updatedOrder = await this.prisma.order.update({
      where: { id },
      data: updateOrderDto,
    });

    await this.clearCache();
    logger.info(`Order updated successfully with ID: ${id}`);
    return updatedOrder;
  }

  async remove(id: string, userId: string): Promise<Order> {
    const order = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      logger.error(`Order not found for deletion with ID: ${id}`);
      throw new ForbiddenException('Замовлення з таким ідентифікатором не знайдено!');
    }

    if (order.userId !== userId) {
      logger.error(`User with ID: ${userId} tried to delete another user's order with ID: ${id}`);
      throw new ForbiddenException('Ви не можете видалити це замовлення, тому що ви не створювали його!');
    }

    const deletedOrder = await this.prisma.order.delete({ where: { id } });

    await this.clearCache();
    logger.info(`Order deleted successfully with ID: ${id}`);
    return deletedOrder;
  }

  async getUserOrderStats(userId: string, requestingUserId: string, isAdmin: boolean): Promise<OrderStats> {
    if(!isAdmin && userId !== requestingUserId) {
      logger.error(`User with ID: ${requestingUserId} attempted to access stats of user with ID: ${userId}`);
      throw new ForbiddenException('У вас немає доступу до даних інших користувачів.');
    }

    const stats = await this.prisma.order.aggregate({
      where: { userId },
      _count: { id: true },
      _sum: { price: true },
    });

    logger.info(`Fetched stats for user with ID: ${userId}`);
    return {
      totalOrders: stats._count.id,
      totalEarnings: stats._sum.price?.toNumber() ?? 0,
    };
  }

  async getTopExpensiveOrders(userId: string, isAdmin: boolean, limit: number = 5): Promise<TopExpensiveOrder[]> {
    logger.info(`Fetching top ${limit} expensive orders for user ID: ${userId}`);
    const orders = await this.prisma.order.findMany({
      where: isAdmin ? {} : { userId },
      orderBy: { price: 'desc' },
      take: limit,
      select: { id: true, title: true, price: true },
    });
    return orders.map(order => ({
      ...order,
      price: order.price.toNumber(),
    }));
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
