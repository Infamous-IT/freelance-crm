import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { OrderService } from '../service/order.service';
import { CreateOrderDto } from '../dto/create-order.dto';
import { UpdateOrderDto } from '../dto/update-order.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/modules/auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { AbstractController } from 'src/common/abstract/controller/abstract.controller';
import { PaginatedTransformInterceptor } from 'src/app/interceptors/paginated-transform.interceptor';
import { CurrentUser } from 'src/app/decorators/current-user.decorator';
import { UserSecure } from 'src/modules/user/entities/user.entity';
import { OrderQueryDto } from '../dto/order-query.dto';
import { OrderQuerySearchParamsDto } from '../dto/order-query-search-params.dto';
import { pagination } from 'src/common/pagination/pagination';
import { OrderResponse } from '../responses/order.response';
import { TransformInterceptor } from 'src/app/interceptors/transform.interceptor';
import { OrderIdParamDto } from 'src/common/dtos/order-id-param.dto';
import { AuthRolesGuard } from 'src/common/guards/user-auth.guard';

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
    type: OrderResponse,
  })
  @UseInterceptors(TransformInterceptor)
  @UseGuards(AuthRolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.FREELANCER)
  async create(
    @Body() createOrderDto: CreateOrderDto,
    @CurrentUser() currentUser: UserSecure
  ) {
    const response = await this.orderService.create(createOrderDto, currentUser.id);
    return this.transformToObject(response, OrderResponse);
  }

  @Get()
  @UseInterceptors( new PaginatedTransformInterceptor( OrderResponse ) )
  @ApiOperation({ summary: 'Отримати список всіх замовлень' })
  @ApiResponse({ status: 200, description: 'Замовлення успішно знайдені' })
  @UseGuards(AuthRolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.FREELANCER)
  async getAllPaginated(
    @Query() param: OrderQuerySearchParamsDto,
    @CurrentUser() currentUser: UserSecure
  ) {
    const { page, perPage } = pagination(param.page, param.perPage);
    
    const orderQueryDto: OrderQueryDto = {
      userId: currentUser.id,
      userRole: currentUser.role
    };

    const response = await this.orderService.findAll(param, page, perPage, orderQueryDto);
    return this.transformToArray(response.data, OrderResponse);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Отримати замовлення за ID' })
  @ApiResponse({
    status: 200,
    description: 'Замовлення успішно знайдено',
    type: OrderResponse,
  })
  @UseInterceptors(TransformInterceptor)
  @UseGuards(AuthRolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.FREELANCER)
  async findOne(
    @Param() param: OrderIdParamDto,
    @CurrentUser() currentUser: UserSecure
  ) {
    const response = await this.orderService.findOne(param.orderId, currentUser.id, currentUser.role);
    return this.transformToObject(response, OrderResponse);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Оновити замовлення' })
  @ApiResponse({
    status: 200,
    description: 'Замовленя успішно оновлене',
    type: OrderResponse,
  })
  @ApiResponse({ status: 403, description: 'Доступ заборонено' })
  @UseInterceptors(TransformInterceptor)
  @UseGuards(AuthRolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.FREELANCER)
  async update(
    @Param() param: OrderIdParamDto,
    @Body() updateOrderDto: UpdateOrderDto,
    @CurrentUser() currentUser: UserSecure
  ) {
    const response = await this.orderService.update(param.orderId, updateOrderDto, currentUser.role, currentUser.id);
    return this.transformToObject(response, OrderResponse);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Видалити замовлення' })
  @ApiResponse({
    status: 200,
    description: 'Замовлення успішно видалене',
    type: OrderResponse,
  })
  @ApiResponse({ status: 403, description: 'Доступ заборонено' })
  @UseInterceptors(TransformInterceptor)
  @UseGuards(AuthRolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.FREELANCER)
  async remove(
    @Param() param: OrderIdParamDto, 
    @CurrentUser() currentUser: UserSecure
  ) {
    const response = await this.orderService.remove(param.orderId, currentUser.id, currentUser.role);
    return this.transformToObject(response, OrderResponse);
  }
}
