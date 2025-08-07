import { Body, Controller, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../decorators/roles.decorator';
import { AuthRolesGuard } from 'src/common/guards/user-auth.guard';
import { UserSecure } from 'src/modules/user/entities/user.entity';
import { AbstractController } from 'src/common/abstract/controller/abstract.controller';
import { TransformInterceptor } from 'src/app/interceptors/transform.interceptor';
import { CurrentUser } from 'src/app/decorators/current-user.decorator';
import { PasswordService } from '../service/password.service';
import { ChangePasswordResponse, ForgotPasswordResponse, UpdatePasswordResponse } from '../responses/auth.response';
import { ForgotPasswordDto } from '../dtos/forgot-password.dto';
import { UpdatePasswordDto } from '../dtos/update-password.dto';
import { ChangePasswordDto } from '../dtos/change-password.dto';

@ApiTags('Password Management')
@Controller('password')
export class PasswordController extends AbstractController {
  constructor(private readonly passwordService: PasswordService) {
    super();
  }

  @Post('forgot')
  @ApiOperation({ summary: 'Забули пароль' })
  @ApiResponse({ status: 200, description: 'Код відправлено на email', type: ForgotPasswordResponse })
  @UseInterceptors(TransformInterceptor)
  async sendForgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    const result = await this.passwordService.sendForgotPassword(forgotPasswordDto.email);
    return this.transformToObject(result, ForgotPasswordResponse);
  }

  @Post('update')
  @ApiOperation({ summary: 'Оновити пароль через код' })
  @ApiResponse({ status: 200, description: 'Пароль успішно оновлено', type: UpdatePasswordResponse })
  @UseInterceptors(TransformInterceptor)
  async updateForgotPassword(@Body() updatePasswordDto: UpdatePasswordDto) {
    const result = await this.passwordService.updateForgotPassword(
      updatePasswordDto.email,
      updatePasswordDto.code,
      updatePasswordDto.newPassword
    );
    return this.transformToObject({ user: result }, UpdatePasswordResponse);
  }

  @Post('change')
  @ApiOperation({ summary: 'Змінити пароль' })
  @ApiResponse({ status: 200, description: 'Пароль успішно змінено', type: ChangePasswordResponse })
  @UseInterceptors(TransformInterceptor)
  @UseGuards(AuthRolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.FREELANCER)
  async changePassword(
    @Body() changePasswordDto: ChangePasswordDto,
    @CurrentUser() currentUser: UserSecure
  ) {
    const result = await this.passwordService.changePassword(
      currentUser.id,
      changePasswordDto.oldPassword,
      changePasswordDto.newPassword
    );
    return this.transformToObject({ user: result }, ChangePasswordResponse);
  }
}
