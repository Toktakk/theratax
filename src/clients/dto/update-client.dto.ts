import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
import { HourExtraDto } from '../../hour-extras/hour-extra.dto.js';
import { PostalAddressDto } from '../../postal-address/postal-address.dto.js';

export class UpdateClientDto extends PostalAddressDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100_000_000)
  hourRatePence?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HourExtraDto)
  hourExtras?: HourExtraDto[];
}
