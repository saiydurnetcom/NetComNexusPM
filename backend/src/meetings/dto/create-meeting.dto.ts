import { IsString, IsNotEmpty, IsDateString, IsOptional } from 'class-validator';

export class CreateMeetingDto {
  @IsOptional()
  @IsString()
  projectId?: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  notes: string;

  @IsDateString()
  @IsNotEmpty()
  meetingDate: string;
}

