import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ProjectMemberRole } from '@prisma/client';

export class AddProjectMemberDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsOptional()
  @IsEnum(ProjectMemberRole)
  role?: ProjectMemberRole;
}

