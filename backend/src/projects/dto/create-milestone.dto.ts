import { IsString, IsNotEmpty, IsDateString, IsOptional } from 'class-validator';

export class CreateMilestoneDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  @IsNotEmpty()
  targetDate: string;
}

