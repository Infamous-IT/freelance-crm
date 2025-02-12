import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { User } from '../entities/user.entity';
import { UserService } from '../service/user.service';
import logger from 'src/logger/logger';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Users')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @ApiOperation({ summary: 'Створити нового користувача' })
  @ApiResponse({ status: 201, description: 'Користувач успішно створений', type: User })
  async create(@Body() createUserDto: CreateUserDto) {
    logger.info('Received request to create a new user');
    const user = await this.userService.create(createUserDto);
    logger.info(`User created: ${user.id} - ${user.email}`);
    return user;
  }

  @Get()
  @ApiOperation({ summary: 'Отримати список всіх користувачів' })
  @ApiResponse({ status: 200, description: 'Список користувачів', type: [User] })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  async findAll(
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 20,
    @Query('sortBy') sortBy: string = 'email',
    @Query('sortOrder') sortOrder: 'asc' | 'desc' = 'asc',
    @Query() filterDto?: { email?: string; firstName?: string; lastName?: string; country?: string },
  ) {
    logger.info(`Received request to get users with page: ${page}, size: ${pageSize}`);
    const users = await this.userService.findAll(page, pageSize, sortBy, sortOrder, filterDto);
    logger.info(`Found ${users.data.length} users on page ${page}`);
    return users;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Отримати користувача за ID' })
  @ApiResponse({ status: 200, description: 'Користувач знайдений', type: User })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.FREELANCER)
  async findOne(@Param('id') id: string) {
    logger.info(`Received request to find user with ID: ${id}`);
    const user = await this.userService.findOne(id);
    logger.info(`User found: ${user.id} - ${user.email}`);
    return user;
  }

  @Get('orders/:userId')
  @ApiOperation({ summary: 'Отримати замовлення користувача за його ID' })
  @ApiResponse({ status: 200, description: 'Користувач та його замовлення знайдено', type: User })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.FREELANCER)
  async getUserOrderWithUser(@Param('userId') userId: string) {
    logger.info(`Received request to get orders for user with ID: ${userId}`);
    const orders = await this.userService.getUserOrderWithCustomers(userId);
    logger.info(`Found ${orders.length} orders for user with ID: ${userId}`);
    return orders;
  }

  @Get('customer-stats/:userId')
  @ApiOperation({ summary: 'Отримати статистику по замовниках користувача' })
  @ApiResponse({ status: 200, description: 'Статистика по замовниках користувача', type: Number })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.FREELANCER)
  async getUserCustomerStats(@Param('userId') userId: string) {
    logger.info(`Received request to get customer stats for user with ID: ${userId}`);
    const stats = await this.userService.getUserCustomerStats(userId);
    logger.info(`Customer stats for user with ID: ${userId}: ${stats}`);
    return stats;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Оновити користувача' })
  @ApiResponse({ status: 200, description: 'Користувач успішно оновлений', type: User })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.FREELANCER)
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    logger.info(`Received request to update user with ID: ${id}`);
    const user = await this.userService.update(id, updateUserDto);
    logger.info(`User updated: ${user.id} - ${user.email}`);
    return user;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Видалити користувача' })
  @ApiResponse({ status: 200, description: 'Користувач успішно видалений', type: User })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  async remove(@Param('id') id: string) {
    logger.info(`Received request to delete user with ID: ${id}`);
    const user = await this.userService.remove(id);
    logger.info(`User removed: ${user.id} - ${user.email}`);
    return user;
  }
}
