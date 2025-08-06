import { Module } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { AuthRolesGuard } from './user-auth.guard';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET_TOKEN,
      signOptions: { expiresIn: process.env.EXPIRATION_TIME_FOR_ACCESS_TOKEN },
    }),
    DatabaseModule
  ],
  providers: [AuthRolesGuard],
  exports: [AuthRolesGuard, JwtModule],
})
export class GuardsModule {}