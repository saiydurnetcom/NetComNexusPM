import { IsString, IsNotEmpty, IsDateString, IsNumber, IsOptional, IsBoolean } from 'class-validator';

export class CreateTimeEntryDto {
  @IsString()
  @IsNotEmpty()
  taskId: string;

  @IsDateString()
  @IsNotEmpty()
  startTime: string;

  @IsDateString()
  @IsNotEmpty()
  endTime: string;

  @IsNumber()
  @IsNotEmpty()
  durationMinutes: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  billable?: boolean;
}

