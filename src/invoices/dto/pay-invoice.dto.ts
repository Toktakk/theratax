import { IsIn, IsOptional, Matches } from 'class-validator';

export class PayInvoiceDto {
  @IsIn(['paid'])
  status: 'paid';

  @IsOptional()
  @Matches(/^\d{2}-\d{2}-\d{4}$/)
  paidOn?: string;
}
