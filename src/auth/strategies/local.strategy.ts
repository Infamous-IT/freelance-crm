import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { UserService } from 'src/user/service/user.service';
import { AuthService } from '../service/auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {
    super({ usernameField: 'username' });
  }

  async validate(username: string, password: string) {
    const user = await this.userService.findByEmail(username);
    if (!user || !(await this.authService.comparePassword(password, user.password))) {
      throw new Error('Invalid credentials');
    }
    return user;
  }
}