import { IsString, IsNotEmpty, IsDateString, IsOptional, IsEnum, IsObject } from 'class-validator';
import { ProjectStatus } from '@prisma/client';

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @IsOptional()
  @IsString()
  purpose?: string;

  @IsOptional()
  @IsObject()
  resources?: any;

  @IsOptional()
  budgetAmount?: number;

  @IsOptional()
  @IsString()
  budgetCurrency?: string;
}

