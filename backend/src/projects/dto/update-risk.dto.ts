import { PartialType } from '@nestjs/mapped-types';
import { CreateRiskDto } from './create-risk.dto';
import { IsOptional, IsDateString } from 'class-validator';

export class UpdateRiskDto extends PartialType(CreateRiskDto) {
  @IsOptional()
  @IsDateString()
  actualMitigationDate?: string;
}

