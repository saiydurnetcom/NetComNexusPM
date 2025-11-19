import { PartialType } from '@nestjs/mapped-types';
import { CreateMilestoneDto } from './create-milestone.dto';
import { IsOptional, IsDateString, IsEnum } from 'class-validator';
import { MilestoneStatus } from '@prisma/client';
import { Transform } from 'class-transformer';

export class UpdateMilestoneDto extends PartialType(CreateMilestoneDto) {
  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => new Date(value).toISOString())
  completedDate?: string;

  @IsOptional()
  @IsEnum(MilestoneStatus)
  status?: MilestoneStatus;
}

