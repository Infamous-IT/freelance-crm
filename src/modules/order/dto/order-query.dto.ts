import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum } from 'class-validator';
import { Role } from '@prisma/client';

export class OrderQueryDto {
  @ApiProperty({
    description: 'ID користувача',
    example: 'a3bb189e-8bf9-3888-9912-ace4e6543002'
  })
  @IsString()
  userId: string;

  @ApiProperty({
    description: 'User Role',
    enum: Role,
    example: Role.FREELANCER
  })
  @IsEnum(Role)
  userRole: Role;
}