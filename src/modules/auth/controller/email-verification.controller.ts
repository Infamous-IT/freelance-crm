import { Body, Controller, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../decorators/roles.decorator';
import { AuthRolesGuard } from 'src/common/guards/user-auth.guard';
import { UserSecure } from 'src/modules/user/entities/user.entity';
import { AbstractController } from 'src/common/abstract/controller/abstract.controller';
import { TransformInterceptor } from 'src/app/interceptors/transform.interceptor';
import { CurrentUser } from 'src/app/decorators/current-user.decorator';
import { SendVerificationCodeResponse, VerifyEmailResponse } from '../responses/auth.response';
import { VerifyEmailDto } from '../dtos/verify-email.dto';
import { SendVerificationCodeDto } from '../dtos/send-verification-code.dto';
import { EmailVerificationService } from '../service/email-verification.service';

@ApiTags('Email Verification')
@Controller('email')
@UseGuards(AuthRolesGuard)
export class EmailController extends AbstractController {
  constructor(private readonly emailVerificationService: EmailVerificationService) {
    super();
  }

  @Post('verify')
  @ApiOperation({ summary: 'Верифікувати email' })
  @ApiResponse({ status: 200, description: 'Email успішно верифіковано', type: VerifyEmailResponse })
  @UseInterceptors(TransformInterceptor)
  @Roles(Role.ADMIN, Role.MANAGER, Role.FREELANCER)
  async verifyEmail(
    @Body() verifyEmailDto: VerifyEmailDto,
    @CurrentUser() currentUser: UserSecure
  ) {
    const result = await this.emailVerificationService.verifyEmail(
      verifyEmailDto.email, 
      verifyEmailDto.code,
      currentUser
    );
    return this.transformToObject({ success: result }, VerifyEmailResponse);
  }

  @Post('send-verification-code')
  @ApiOperation({ summary: 'Відправити код верифікації' })
  @ApiResponse({ status: 200, description: 'Код успішно відправлено', type: SendVerificationCodeResponse })
  @UseInterceptors(TransformInterceptor)
  @Roles(Role.ADMIN, Role.MANAGER, Role.FREELANCER)
  async sendVerificationCode(
    @Body() sendVerificationCodeDto: SendVerificationCodeDto,
    @CurrentUser() currentUser: UserSecure
  ) {
    await this.emailVerificationService.sendVerificationCode(
      sendVerificationCodeDto.email,
      currentUser
    );
    const response = { message: 'Code successfully sending on your email' };
    return this.transformToObject(response, SendVerificationCodeResponse);
  }
}