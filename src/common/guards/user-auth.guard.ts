import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { DatabaseService } from 'src/database/service/database.service';

@Injectable()
export class AuthRolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly databaseService: DatabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException('Token was not found');
    }

    const payload = await this.validateToken(token);
    const user = await this.findUserById(payload.sub);
    
    if (!user) {
      throw new UnauthorizedException('Користувача не знайдено');
    }

    if (!user.isEmailVerified) {
      throw new UnauthorizedException('Email не підтверджено');
    }

    const isRevoked = await this.isTokenRevoked(token);
    if (isRevoked) {
      throw new UnauthorizedException('Токен відкликано');
    }

    request.user = user;

    const requiredRoles = this.reflector.getAllAndOverride<Role[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (requiredRoles && requiredRoles.length > 0) {
      if (!requiredRoles.includes(user.role)) {
        throw new ForbiddenException(
          `Доступ заборонено. Потрібні ролі: ${requiredRoles.join(', ')}`
        );
      }
    }

    return true;
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  private async validateToken(token: string): Promise<any> {
    try {
      return await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET_TOKEN,
      });
    } catch (error) {
      throw new UnauthorizedException('Невірний токен');
    }
  }

  private async findUserById(userId: string) {
    return await this.databaseService.user.findUnique({
      where: { id: userId },
      include: {
        orders: true
      }
    });
  }

  private async isTokenRevoked(token: string): Promise<boolean> {
    try {
      const redisClient = (this.databaseService as any).redisClient;
      if (redisClient) {
        const isRevoked = await redisClient.get(`revoked_token:${token}`);
        return !!isRevoked;
      }
      return false;
    } catch (error) {
      return false;
    }
  }
}