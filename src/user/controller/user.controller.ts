import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { User } from '../entities/user.entity';
import { UserService } from '../service/user.service';

@ApiTags('Users')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @ApiOperation({ summary: 'Створити нового користувача' })
  @ApiResponse({ status: 201, description: 'Користувач успішно створений', type: User })
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Get()
  @ApiOperation({ summary: 'Отримати список всіх користувачів' })
  @ApiResponse({ status: 200, description: 'Список користувачів', type: [User] })
  @UseGuards(AuthGuard('jwt'))
  findAll(
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 20,
    @Query('sortBy') sortBy: string = 'email',
    @Query('sortOrder') sortOrder: 'asc' | 'desc' = 'asc',
    @Query() filterDto?: { email?: string; firstName?: string; lastName?: string; country?: string },
  ) {
    return this.userService.findAll(page, pageSize, sortBy, sortOrder, filterDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Отримати користувача за ID' })
  @ApiResponse({ status: 200, description: 'Користувач знайдений', type: User })
  @UseGuards(AuthGuard('jwt'))
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Get('orders/:userId')
  @ApiOperation({ summary: 'Отримати замовлення користувача за його ID' })
  @ApiResponse({ status: 200, description: 'Користувач та його замовлення знайдено', type: User })
  @UseGuards(AuthGuard('jwt'))
  getUserOrderWithUser(@Param('userId') userId: string) {
    return this.userService.getUserOrderWithCustomers(userId);
  }

  @Get('customer-stats/:userId')
  @ApiOperation({ summary: 'Отримати статистику по замовниках користувача' })
  @ApiResponse({ status: 200, description: 'Статистика по замовниках користувача', type: Number })
  @UseGuards(AuthGuard('jwt'))
  getUserCustomerStats(@Param('userId') userId: string) {
    return this.userService.getUserCustomerStats(userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Оновити користувача' })
  @ApiResponse({ status: 200, description: 'Користувач успішно оновлений', type: User })
  @UseGuards(AuthGuard('jwt'))
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Видалити користувача' })
  @ApiResponse({ status: 200, description: 'Користувач успішно видалений', type: User })
  @UseGuards(AuthGuard('jwt'))
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}
