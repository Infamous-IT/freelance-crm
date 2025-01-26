import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateOrderDto } from '../dto/create-order.dto';
import { UpdateOrderDto } from '../dto/update-order.dto';

@Injectable()
export class OrderService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createOrderDto: CreateOrderDto) {
    const { startDate, endDate, ...otherFields } = createOrderDto;

    const formattedStartDate = this.convertDateToISO(startDate);
    const formattedEndDate = this.convertDateToISO(endDate);

    return await this.prisma.order.create({
      data: {
        ...otherFields,
        startDate: formattedStartDate,
        endDate: formattedEndDate,
      },
    });
  }

  async findAll(page: number = 1) {
    const take = 20;
    const skip = (page - 1) * take;

    const [orders, totalCount] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        skip,
        take,
        include: { customer: true, user: true },
      }),
      this.prisma.order.count(),
    ]);

    return {
      data: orders,
      totalCount,
      totalPages: Math.ceil(totalCount / take),
      currentPage: page,
    };
  }

  async findOne(id: string) {
    return await this.prisma.order.findUnique({
      where: { id },
      include: { customer: true, user: true },
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

    return await this.prisma.order.update({
      where: { id },
      data: updateOrderDto,
    });
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

    return await this.prisma.order.delete({
      where: { id },
    });
  }

  private convertDateToISO(date: string): string {
    const [day, month, year] = date.split('-').map(Number);
    const formattedDate = new Date(year, month - 1, day);
    return formattedDate.toISOString();
  }
}
