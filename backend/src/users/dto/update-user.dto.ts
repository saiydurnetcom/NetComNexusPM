import { IsString, IsEnum, IsBoolean, IsOptional } from 'class-validator';
import { Role } from '@prisma/client';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  teamId?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;
}

