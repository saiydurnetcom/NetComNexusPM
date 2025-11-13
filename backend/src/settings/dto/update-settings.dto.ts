import { IsString, IsOptional } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional()
  @IsString()
  aiApiKey?: string;

  @IsOptional()
  @IsString()
  aiApiUrl?: string;

  @IsOptional()
  @IsString()
  aiModel?: string;
}

