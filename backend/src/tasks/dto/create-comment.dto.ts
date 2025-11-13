import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mentionedUserIds?: string[];
}

