import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { OrderService } from '../service/order.service';
import { CreateOrderDto } from '../dto/create-order.dto';
import { UpdateOrderDto } from '../dto/update-order.dto';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Order } from '../entities/order.entity';
import { AuthGuard } from '@nestjs/passport';
import logger from 'src/common/logger/logger';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import { Roles } from 'src/modules/auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { PaginatedOrders } from 'src/modules/order/interfaces/order.interface';
import { AbstractController } from 'src/common/abstract/controller/abstract.controller';
import { GetOrdersDto } from '../dto/get-orders.dto';
import { PaginatedTransformInterceptor } from 'src/app/interceptors/paginated-transform.interceptor';

@ApiTags('Orders')
@Controller('order')
export class OrderController extends AbstractController {
  constructor(private readonly orderService: OrderService) {
    super();
  }

  @Post()
  @ApiOperation({ summary: 'Створити нове замовлення' })
  @ApiResponse({
    status: 201,
    description: 'Замовлення успішно створене',
    type: Order,
  })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.FREELANCER)
  create(@Body() createOrderDto: CreateOrderDto): Promise<Order> {
    logger.info('Received request to create a new order');
    return this.orderService.create(createOrderDto);
  }

  @Get()
  @UseInterceptors( new PaginatedTransformInterceptor( Order ) )
  @ApiOperation({ summary: 'Отримати список всіх замовлень' })
  @ApiResponse({ status: 200, description: 'Замовлення успішно знайдені' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.FREELANCER)
  async getAllPaginated(
    @Query() getOrdersDto: GetOrdersDto,
    @Query('page') page: number = 1,
    @Query('perPage') perPage: number = 20,
  ): Promise<PaginatedOrders> {
    logger.info(`Fetching orders with filters: ${JSON.stringify(getOrdersDto)}`);
    return this.orderService.findAll(getOrdersDto, page, perPage);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Отримати замовлення за ID' })
  @ApiResponse({
    status: 200,
    description: 'Замовлення успішно знайдено',
    type: Order,
  })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.FREELANCER)
  findOne(@Param('id') id: string): Promise<Order | null> {
    logger.info(`Received request to get order with ID: ${id}`);
    return this.orderService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Оновити замовлення' })
  @ApiResponse({
    status: 200,
    description: 'Замовленя успішно оновлене',
    type: Order,
  })
  @ApiResponse({ status: 403, description: 'Доступ заборонено' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.FREELANCER)
  update(
    @Param('id') id: string,
    @Body() updateOrderDto: UpdateOrderDto,
    @Req() req: any,
  ): Promise<Order> {
    const userId = req.user.id;
    logger.info(
      `User with ID: ${userId} is attempting to update order with ID: ${id}`,
    );
    return this.orderService.update(id, userId, updateOrderDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Видалити замовлення' })
  @ApiResponse({
    status: 200,
    description: 'Замовлення успішно видалене',
    type: Order,
  })
  @ApiResponse({ status: 403, description: 'Доступ заборонено' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.FREELANCER)
  remove(@Param('id') id: string, @Req() req: any): Promise<Order> {
    const userId = req.user.id;
    logger.info(
      `User with ID: ${userId} is attempting to delete order with ID: ${id}`,
    );
    return this.orderService.remove(id, userId);
  }
}
