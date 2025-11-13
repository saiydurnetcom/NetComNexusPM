import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreateAttachmentDto {
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @IsString()
  @IsNotEmpty()
  fileUrl: string;

  @IsNumber()
  @IsNotEmpty()
  fileSize: number;

  @IsOptional()
  @IsString()
  mimeType?: string;
}

