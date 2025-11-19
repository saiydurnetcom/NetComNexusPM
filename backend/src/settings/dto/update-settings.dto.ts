import { IsString, IsOptional, IsBoolean, IsIn } from 'class-validator';

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

  // Email settings
  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @IsOptional()
  @IsString()
  emailApiUrl?: string;

  @IsOptional()
  @IsString()
  emailApiKey?: string;

  @IsOptional()
  @IsString()
  emailFrom?: string;

  @IsOptional()
  @IsIn(['resend', 'sendgrid', 'ses', 'custom'])
  emailProvider?: 'resend' | 'sendgrid' | 'ses' | 'custom';

  // Push settings
  @IsOptional()
  @IsBoolean()
  pushEnabled?: boolean;

  @IsOptional()
  @IsString()
  pushVapidPublicKey?: string;

  @IsOptional()
  @IsString()
  pushVapidPrivateKey?: string;
}

