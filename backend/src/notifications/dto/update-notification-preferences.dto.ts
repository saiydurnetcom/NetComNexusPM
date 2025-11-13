import { IsBoolean, IsOptional, IsObject } from 'class-validator';

export class UpdateNotificationPreferencesDto {
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  taskAssignments?: boolean;

  @IsOptional()
  @IsBoolean()
  projectUpdates?: boolean;

  @IsOptional()
  @IsBoolean()
  meetingReminders?: boolean;

  @IsOptional()
  @IsBoolean()
  pushNotifications?: boolean;

  @IsOptional()
  @IsObject()
  pushSubscription?: any;
}

