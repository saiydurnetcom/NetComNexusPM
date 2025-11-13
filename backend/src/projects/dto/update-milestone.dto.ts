import { PartialType } from '@nestjs/mapped-types';
import { CreateMilestoneDto } from './create-milestone.dto';
import { IsOptional, IsDateString, IsEnum } from 'class-validator';
import { MilestoneStatus } from '@prisma/client';

export class UpdateMilestoneDto extends PartialType(CreateMilestoneDto) {
  @IsOptional()
  @IsDateString()
  completedDate?: string;

  @IsOptional()
  @IsEnum(MilestoneStatus)
  status?: MilestoneStatus;
}

