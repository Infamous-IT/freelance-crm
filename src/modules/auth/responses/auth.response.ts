import { Expose, Type } from 'class-transformer';
import { UserResponse } from 'src/modules/user/responses/user.response';

export class LoginResponse {
  @Expose()
  message: string;

  @Expose()
  accessToken: string;

  @Expose()
  refreshToken: string;
}

export class RegisterResponse {
  @Expose()
  message: string;

  @Expose()
  @Type( () => UserResponse )
  user: UserResponse;
}

export class RefreshTokenResponse {
  @Expose()
  accessToken: string;

  @Expose()
  refreshToken: string;
}

export class LogoutResponse {
  @Expose()
  message: string;
}

export class VerifyEmailResponse {
  @Expose()
  success: boolean;
}

export class SendVerificationCodeResponse {
  @Expose()
  message: string;
}

export class ForgotPasswordResponse {
  @Expose()
  message: string;
}

export class UpdatePasswordResponse {
  @Expose()
  @Type( () => UserResponse )
  user: UserResponse;
}

export class ChangePasswordResponse {
  @Expose()
  @Type( () => UserResponse )
  user: UserResponse;
}