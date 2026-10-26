import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateClientDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @IsInt()
  @Min(1)
  @Max(100_000_000)
  hourRatePence: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100_000_000)
  pregnancyExtraPence?: number;
}
