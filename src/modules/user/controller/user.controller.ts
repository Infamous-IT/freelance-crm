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
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { User, UserSecure } from '../entities/user.entity';
import { UserService } from '../service/user.service';
import { Roles } from 'src/modules/auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { AbstractController } from 'src/common/abstract/controller/abstract.controller';
import { GetUsersDto } from '../dto/get-users.dto';
import { PaginatedTransformInterceptor } from 'src/app/interceptors/paginated-transform.interceptor';
import { TransformInterceptor } from 'src/app/interceptors/transform.interceptor';
import { UserResponse } from '../responses/user.response';
import { AuthRolesGuard } from 'src/common/guards/user-auth.guard';
import { UserIdParamDto } from 'src/common/dtos/user-id-param.dto';
import { CurrentUser } from 'src/app/decorators/current-user.decorator';

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
  @UseInterceptors(TransformInterceptor)
  async create(@Body() createUserDto: CreateUserDto) {
    const response = await this.userService.create(createUserDto);
    return this.transformToObject(response, UserResponse);
  }

  @Get()
  @UseInterceptors( new PaginatedTransformInterceptor( UserResponse ) )
  @ApiOperation({ summary: 'Отримати список всіх користувачів' })
  @ApiResponse({ status: 200, description: 'Список користувачів' })
  @UseGuards(AuthRolesGuard)
  @Roles(Role.ADMIN)
  async getAllPaginated(
    @Query() getUsersDto: GetUsersDto,
    @Query('page') page: number = 1,
    @Query('perPage') perPage: number = 20,
  ) {
    const response = await this.userService.findAll(getUsersDto, page, perPage);
    return this.transformToArray(response.data, UserResponse);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Отримати користувача за ID' })
  @ApiResponse({ status: 200, description: 'Користувач знайдений', type: UserResponse })
  @UseInterceptors(TransformInterceptor)
  @UseGuards(AuthRolesGuard)
  @Roles(Role.ADMIN, Role.FREELANCER)
  async findOne(@Param() param: UserIdParamDto) {
    const response = await this.userService.findOneOrThrow(param.userId);
    return this.transformToObject(response, UserResponse);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Оновити користувача' })
  @ApiResponse({
    status: 200,
    description: 'Користувач успішно оновлений',
    type: User,
  })
  @UseGuards(AuthRolesGuard)
  @UseInterceptors(TransformInterceptor)
  @Roles(Role.ADMIN, Role.MANAGER, Role.FREELANCER)
  async update(
    @Param() param: UserIdParamDto,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() currentUser: UserSecure,
  ) {
    const response = await this.userService.update(
      param.userId, 
      updateUserDto, 
      currentUser.id, 
      currentUser.role
    );
    return this.transformToObject(response, UserResponse);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Видалити користувача' })
  @ApiResponse({
    status: 200,
    description: 'Користувач успішно видалений',
    type: User,
  })
  @UseInterceptors(TransformInterceptor)
  @UseGuards(AuthRolesGuard)
  @Roles(Role.ADMIN)
  async remove(@Param() param: UserIdParamDto) {
    const response = await this.userService.remove(param.userId);
    return this.transformToObject(response, UserResponse);
  }
}
