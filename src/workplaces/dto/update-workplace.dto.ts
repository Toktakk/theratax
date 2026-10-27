import { Type } from 'class-transformer';
import { IsArray, IsInt, IsString, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
import { HourExtraDto } from '../../hour-extras/hour-extra.dto.js';
import { PostalAddressDto } from '../../postal-address/postal-address.dto.js';

export class UpdateWorkplaceDto extends PostalAddressDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @IsInt()
  @Min(1)
  @Max(100_000_000)
  hourRatePence: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HourExtraDto)
  hourExtras: HourExtraDto[];
}
