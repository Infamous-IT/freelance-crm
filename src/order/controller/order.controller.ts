import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Req, UseGuards } from '@nestjs/common';
import { OrderService } from '../service/order.service';
import { CreateOrderDto } from '../dto/create-order.dto';
import { UpdateOrderDto } from '../dto/update-order.dto';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Order } from '../entities/order.entity';
import { AuthGuard } from '@nestjs/passport';
import logger from 'src/logger/logger';

@ApiTags('Orders')
@Controller('order')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @ApiOperation({ summary: 'Створити нове замовлення' })
  @ApiResponse({ status: 201, description: 'Замовлення успішно створене', type: Order })
  @UseGuards(AuthGuard('jwt'))
  create(@Body() createOrderDto: CreateOrderDto) {
    logger.info('Received request to create a new order');
    return this.orderService.create(createOrderDto);
  }

  @Get()
  @ApiOperation({ summary: 'Отримати список всіх замовлень' })
  @ApiResponse({ status: 200, description: 'Замовлення успішно знайдені', type: Order })
  @ApiQuery({ name: 'page', required: false, description: 'Номер сторінки', example: 1 })
  @UseGuards(AuthGuard('jwt'))
  findAll(@Query('page') page: number) {
    logger.info(`Received request to get orders on page ${page}`);
    return this.orderService.findAll(Number(page) || 1);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Отримати замовлення за ID' })
  @ApiResponse({ status: 200, description: 'Замовлення успішно знайдено', type: Order })
  @UseGuards(AuthGuard('jwt'))
  findOne(@Param('id') id: string) {
    logger.info(`Received request to get order with ID: ${id}`);
    return this.orderService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Оновити замовлення' })
  @ApiResponse({ status: 200, description: 'Замовленя успішно оновлене', type: Order })
  @ApiResponse({ status: 403, description: 'Доступ заборонено' })
  @UseGuards(AuthGuard('jwt'))
  update(@Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto, @Req() req: any) {
    const userId = req.user.id;
    logger.info(`User with ID: ${userId} is attempting to update order with ID: ${id}`);
    return this.orderService.update(id, userId, updateOrderDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Видалити замовлення' })
  @ApiResponse({ status: 200, description: 'Замовлення успішно видалене', type: Order })
  @ApiResponse({ status: 403, description: 'Доступ заборонено' })
  @UseGuards(AuthGuard('jwt'))
  remove(@Param('id') id: string, @Req() req: any) {
    const userId = req.user.id;
    logger.info(`User with ID: ${userId} is attempting to delete order with ID: ${id}`);
    return this.orderService.remove(id, userId);
  }

  @Get('stats/user')
  @ApiOperation({ summary: 'Отримати статистику замовлень для поточного користувача' })
  @ApiResponse({ status: 200, description: 'Успішно отримано статистику' })
  @UseGuards(AuthGuard('jwt'))
  getUserOrderStats(@Req() req: any) {
    logger.info(`Fetching order statistics for user with ID: ${req.user.id}`);
    return this.orderService.getUserOrderStats(req.user.id, req.user.id, req.user.role === 'ADMIN');
  }

  @Get('stats/top-expensive')
  @ApiOperation({ summary: 'Отримати найдорожчі замовлення' })
  @ApiQuery({ name: 'limit', required: false, description: 'Кількість найдорожчих замовлень', example: 5 })
  @ApiResponse({ status: 200, description: 'Успішно отримано найдорожчі замовлення' })
  @UseGuards(AuthGuard('jwt'))
  getTopExpensiveOrders(@Req() req: any, @Query('limit') limit: number) {
    const isAdmin = req.user.role === 'ADMIN';
    logger.info(`Fetching top ${limit} expensive orders for user with ID: ${req.user.id}`);
    return this.orderService.getTopExpensiveOrders(req.user.id, isAdmin, Number(limit) || 5);
  }
}
