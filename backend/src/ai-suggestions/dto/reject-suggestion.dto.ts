import { IsString, IsNotEmpty } from 'class-validator';

export class RejectSuggestionDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}

