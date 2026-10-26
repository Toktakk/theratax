import { IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';

export class UpdateTransactionDto {
  @IsOptional()
  @Matches(/^\d{2}-\d{2}-\d{4}$/)
  occurredOn?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  note?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100_000_000)
  amountPence?: number;

  @IsOptional()
  @IsString()
  categorySlug?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100_000)
  miles?: number;
}