import { PartialType } from '@nestjs/mapped-types';
import { CreateRiskDto } from './create-risk.dto';
import { IsOptional, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateRiskDto extends PartialType(CreateRiskDto) {
  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => new Date(value).toISOString())
  actualMitigationDate?: string;
}

