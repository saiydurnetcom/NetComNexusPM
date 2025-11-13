import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ReportType } from '@prisma/client';

export class CreateReportDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsOptional()
  @IsEnum(ReportType)
  reportType?: ReportType;
}

