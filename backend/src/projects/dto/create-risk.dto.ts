import { IsString, IsNotEmpty, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { RiskCategory, RiskLevel, RiskStatus } from '@prisma/client';

export class CreateRiskDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(RiskCategory)
  @IsNotEmpty()
  riskCategory: RiskCategory;

  @IsEnum(RiskLevel)
  @IsOptional()
  probability?: RiskLevel;

  @IsEnum(RiskLevel)
  @IsOptional()
  impact?: RiskLevel;

  @IsEnum(RiskStatus)
  @IsOptional()
  status?: RiskStatus;

  @IsOptional()
  @IsString()
  mitigationStrategy?: string;

  @IsOptional()
  @IsString()
  mitigationOwnerId?: string;

  @IsOptional()
  @IsDateString()
  targetMitigationDate?: string;
}

