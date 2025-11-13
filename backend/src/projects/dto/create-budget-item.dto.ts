import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class CreateBudgetItemDto {
  @IsString()
  @IsNotEmpty()
  category: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @IsNotEmpty()
  budgetedAmount: number;

  @IsOptional()
  @IsNumber()
  actualAmount?: number;

  @IsOptional()
  @IsString()
  currency?: string;
}

