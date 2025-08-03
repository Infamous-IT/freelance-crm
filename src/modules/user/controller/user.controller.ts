import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { User } from '../entities/user.entity';
import { UserService } from '../service/user.service';
import logger from 'src/common/logger/logger';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import { Roles } from 'src/modules/auth/decorators/roles.decorator';
import { Order, Role } from '@prisma/client';
import { PaginatedUsers } from 'src/modules/user/interfaces/user.interface';
import { AbstractController } from 'src/common/abstract/controller/abstract.controller';
import { GetUsersDto } from '../dto/get-users.dto';
import { PaginatedTransformInterceptor } from 'src/app/interceptors/paginated-transform.interceptor';

@ApiTags('Users')
@Controller('user')
export class UserController extends AbstractController {
  constructor(private readonly userService: UserService) {
    super();
  }

  @Post()
  @ApiOperation({ summary: 'Створити нового користувача' })
  @ApiResponse({
    status: 201,
    description: 'Користувач успішно створений',
    type: User,
  })
  async create(@Body() createUserDto: CreateUserDto): Promise<User> {
    logger.info('Received request to create a new user');
    const user = await this.userService.create(createUserDto);
    logger.info(`User created: ${user.id} - ${user.email}`);
    return user;
  }

  @Get()
  @UseInterceptors( new PaginatedTransformInterceptor( User ) )
  @ApiOperation({ summary: 'Отримати список всіх користувачів' })
  @ApiResponse({ status: 200, description: 'Список користувачів' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  async getAllPaginated(
    @Query() getUsersDto: GetUsersDto,
    @Query('page') page: number = 1,
    @Query('perPage') perPage: number = 20,
  ): Promise<PaginatedUsers> {
    logger.info(`Fetching users with filters: ${JSON.stringify(getUsersDto)}`);
    return this.userService.findAll(getUsersDto, page, perPage);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Отримати користувача за ID' })
  @ApiResponse({ status: 200, description: 'Користувач знайдений', type: User })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.FREELANCER)
  async findOne(@Param('id') id: string): Promise<User & { orders: Order[] }> {
    logger.info(`Received request to find user with ID: ${id}`);
    const user = await this.userService.findOne(id);
    logger.info(`User found: ${user.id} - ${user.email}`);
    return user;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Оновити користувача' })
  @ApiResponse({
    status: 200,
    description: 'Користувач успішно оновлений',
    type: User,
  })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.FREELANCER)
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<User> {
    logger.info(`Received request to update user with ID: ${id}`);
    const user = await this.userService.update(id, updateUserDto);
    logger.info(`User updated: ${user.id} - ${user.email}`);
    return user;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Видалити користувача' })
  @ApiResponse({
    status: 200,
    description: 'Користувач успішно видалений',
    type: User,
  })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  async remove(@Param('id') id: string): Promise<User> {
    logger.info(`Received request to delete user with ID: ${id}`);
    const user = await this.userService.remove(id);
    logger.info(`User removed: ${user.id} - ${user.email}`);
    return user;
  }
}
