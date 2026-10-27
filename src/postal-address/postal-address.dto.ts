import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class PostalAddressDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  addressLine1: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  addressLine2?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  town: string;

  @IsString()
  @MinLength(1)
  @MaxLength(8)
  postcode: string;
}
