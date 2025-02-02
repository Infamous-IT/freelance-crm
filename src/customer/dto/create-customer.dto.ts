import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsEmail, IsOptional, IsString, IsUUID } from "class-validator";

export class CreateCustomerDto {
    @ApiProperty({
        example: 'Nazar Замовник',
        description: 'Імʼя та прізвище замовника',
      })
    @IsString()
    fullName: string;

    @ApiProperty({
        example: 'test@gmail.com',
        description: 'Електронна адреса замовника',
      })
    @IsEmail()
    @IsOptional()
    email?: string;

    @ApiProperty({
        example: 't.me/test',
        description: 'Телеграм замовника',
      })
    @IsString()
    @IsOptional()
    telegram?: string;

    @ApiProperty({
        example: 'Test IT Solution',
        description: 'Компанія замовника',
      })
    @IsString()
    @IsOptional()
    company?: string;

    @ApiProperty({
      example: ['a3bb189e-8bf9-3888-9912-ace4e6543002', 'b3cc2300-3345-4450-b225-52de83421f07'],
      description: 'Масив ідентифікаторів замовлень для замовника',
      required: false,
    })
    @IsArray()
    @IsUUID('4', { each: true })
    @IsOptional()
    orderIds?: string[];
}
