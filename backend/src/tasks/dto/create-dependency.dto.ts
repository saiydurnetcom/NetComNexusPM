import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { DependencyType } from '@prisma/client';

export class CreateDependencyDto {
  @IsString()
  @IsNotEmpty()
  dependsOnTaskId: string;

  @IsOptional()
  @IsEnum(DependencyType)
  dependencyType?: DependencyType;
}

