import { IsString, IsNotEmpty, IsDateString, IsOptional, IsEnum, IsObject } from 'class-validator';
import { ProjectStatus } from '@prisma/client';
import { Transform } from 'class-transformer';

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  @IsNotEmpty()
  @Transform(({ value }) => new Date(value).toISOString())
  startDate: string;

  @IsDateString()
  @IsNotEmpty()
  @Transform(({ value }) => new Date(value).toISOString())
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

