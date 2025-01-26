import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Req } from '@nestjs/common';
import { OrderService } from '../service/order.service';
import { CreateOrderDto } from '../dto/create-order.dto';
import { UpdateOrderDto } from '../dto/update-order.dto';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Order } from '../entities/order.entity';

@ApiTags('Orders')
@Controller('order')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @ApiOperation({ summary: 'Створити нове замовлення' })
  @ApiResponse({ status: 201, description: 'Замовлення успішно створене', type: Order })
  create(@Body() createOrderDto: CreateOrderDto) {
    return this.orderService.create(createOrderDto);
  }

  @Get()
  @ApiOperation({ summary: 'Отримати список всіх замовлень' })
  @ApiResponse({ status: 200, description: 'Замовлення успішно знайдені', type: Order })
  @ApiQuery({ name: 'page', required: false, description: 'Номер сторінки', example: 1 })
  findAll(@Query('page') page: number) {
    return this.orderService.findAll(Number(page) || 1);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Отримати замовлення за ID' })
  @ApiResponse({ status: 200, description: 'Замовлення успішно знайдено', type: Order })
  findOne(@Param('id') id: string) {
    return this.orderService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Оновити замовлення' })
  @ApiResponse({ status: 200, description: 'Замовленя успішно оновлене', type: Order })
  @ApiResponse({ status: 403, description: 'Доступ заборонено' })
  update(@Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto, @Req() req: any) {
    const userId = req.user.id;
    return this.orderService.update(id, userId, updateOrderDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Видалити замовлення' })
  @ApiResponse({ status: 200, description: 'Замовлення успішно видалене', type: Order })
  @ApiResponse({ status: 403, description: 'Доступ заборонено' })
  remove(@Param('id') id: string, @Req() req: any) {
    const userId = req.user.id;
    return this.orderService.remove(id, userId);
  }
}
