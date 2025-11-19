import { Transform } from 'class-transformer';
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
  @Transform(({ value }) => new Date(value).toISOString())
  targetDate: string;
}

