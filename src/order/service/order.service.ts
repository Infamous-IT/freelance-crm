import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { RedisClientType } from 'redis';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateOrderDto } from '../dto/create-order.dto';
import { UpdateOrderDto } from '../dto/update-order.dto';

@Injectable()
export class OrderService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('REDIS_CLIENT') private readonly redis: RedisClientType,
    ) {}

  async create(createOrderDto: CreateOrderDto) {
    const { startDate, endDate, ...otherFields } = createOrderDto;

    const formattedStartDate = this.convertDateToISO(startDate);
    const formattedEndDate = this.convertDateToISO(endDate);

    const order = await this.prisma.order.create({
      data: {
        ...otherFields,
        startDate: formattedStartDate,
        endDate: formattedEndDate,
      },
    });

    await this.clearCache();
    
    return order;
  }

  async findAll(page: number = 1) {
    const take = 20;
    page = parseInt(String(page), 10);
    const skip = (page - 1) * take;

    const cacheKey = `orders:page=${page}:size=${take}`;
    const cachedData = await this.redis.get(cacheKey);

    if (cachedData) {
      return JSON.parse(cachedData);
    }

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

    return result;
  }

  async findOne(id: string) {
    return await this.prisma.order.findUnique({
      where: { id },
      include: { customers: true, user: true },
    });
  }

  async update(id: string, userId: string, updateOrderDto: UpdateOrderDto) {
    const order = await this.prisma.order.findUnique({
      where: { id },
    });

    if(!order) {
      throw new ForbiddenException('Замовлення з таким ідентифікатором не знайдено!');
    }

    if(order.userId !== userId) {
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

    return updatedOrder;
  }

  async remove(id: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new ForbiddenException('Замовлення з таким ідентифікатором не знайдено!');
    }

    if (order.userId !== userId) {
      throw new ForbiddenException('Ви не можете видалити це замовлення, тому що ви не створювали його!');
    }

    const deletedOrder = await this.prisma.order.delete({ where: { id } });

    await this.clearCache();

    return deletedOrder;
  }

  private convertDateToISO(date: string): string {
    const [day, month, year] = date.split('-').map(Number);
    const formattedDate = new Date(year, month - 1, day);
    return formattedDate.toISOString();
  }

  private async clearCache() {
    const keys = await this.redis.keys('orders:*');
    if (keys.length > 0) {
      await this.redis.del(keys);
    }
  }
}
