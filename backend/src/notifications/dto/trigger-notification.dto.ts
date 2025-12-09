import { NotificationType } from '@prisma/client';
import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';

export class TriggerNotificationDto {
    @IsString()
    userId!: string;

    @IsEnum(NotificationType)
    type!: NotificationType;

    @IsString()
    title!: string;

    @IsString()
    message!: string;

    @IsOptional()
    @IsString()
    relatedTaskId?: string;

    @IsOptional()
    @IsString()
    relatedProjectId?: string;

    @IsOptional()
    @IsString()
    relatedCommentId?: string;

    // Optional metadata for email/push templates; not persisted by backend yet.
    @IsOptional()
    @IsObject()
    metadata?: Record<string, unknown>;
}
