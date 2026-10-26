import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateInvoiceDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  clientName: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  service: string;

  @IsInt()
  @Min(1)
  @Max(100_000_000)
  amountPence: number;

  @IsOptional()
  @Matches(/^\d{2}-\d{2}-\d{4}$/)
  issuedOn?: string;
}
