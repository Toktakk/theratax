import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { OnboardedGuard } from '../auth/onboarded.guard.js';
import type { PublicUser } from '../auth/public-user.js';
import { CreateInvoiceDto } from './dto/create-invoice.dto.js';
import { ListInvoicesQueryDto } from './dto/list-invoices-query.dto.js';
import { PayInvoiceDto } from './dto/pay-invoice.dto.js';
import { PreviewInvoiceQueryDto } from './dto/preview-invoice-query.dto.js';
import { buildInvoicePdf } from './invoice-pdf.js';
import type { InvoicePdfLine } from './invoice-pdf.js';
import type { PostalAddress } from '../postal-address/postal-address.js';
import { InvoicesService } from './invoices.service.js';
import type {
  InvoiceListResponse,
  InvoicePreviewResponse,
  InvoiceResponse,
} from './invoices.service.js';

@Controller('invoices')
@UseGuards(AuthGuard, OnboardedGuard)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  list(
    @CurrentUser() user: PublicUser,
    @Query() query: ListInvoicesQueryDto,
  ): Promise<InvoiceListResponse> {
    return this.invoicesService.list(user, query);
  }

  @Post()
  create(
    @CurrentUser() user: PublicUser,
    @Body() body: CreateInvoiceDto,
  ): Promise<InvoiceResponse> {
    return this.invoicesService.create(user, body);
  }

  @Get('preview')
  preview(
    @CurrentUser() user: PublicUser,
    @Query() query: PreviewInvoiceQueryDto,
  ): Promise<InvoicePreviewResponse> {
    return this.invoicesService.preview(user, query);
  }

  @Get(':id/pdf')
  async pdf(
    @CurrentUser() user: PublicUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<StreamableFile> {
    const invoice = await this.invoicesService.findOne(user, id);
    const bytes = await buildInvoicePdf({
      therapistName: user.name,
      therapistEmail: user.email,
      therapistAddress: pdfAddress(
        invoice.supplierAddressLine1,
        invoice.supplierAddressLine2,
        invoice.supplierTown,
        invoice.supplierPostcode,
      ),
      number: invoice.number,
      issuedOn: invoice.issuedOn,
      recipientName: invoice.recipientName ?? invoice.clientName ?? '',
      recipientAddress: pdfAddress(
        invoice.recipientAddressLine1,
        invoice.recipientAddressLine2,
        invoice.recipientTown,
        invoice.recipientPostcode,
      ),
      periodStart: invoice.periodStart ?? invoice.issuedOn,
      periodEnd: invoice.periodEnd ?? invoice.issuedOn,
      amountPence: invoice.amountPence,
      status: invoice.status,
      paidOn: invoice.paidOn,
      lines: pdfLines(invoice),
    });
    return new StreamableFile(Buffer.from(bytes), {
      type: 'application/pdf',
      disposition: `attachment; filename="${invoice.number}.pdf"`,
    });
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: PublicUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<InvoiceResponse> {
    return this.invoicesService.findOne(user, id);
  }

  @Patch(':id')
  pay(
    @CurrentUser() user: PublicUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: PayInvoiceDto,
  ): Promise<InvoiceResponse> {
    return this.invoicesService.pay(user, id, body);
  }
}

function pdfAddress(
  line1: string | undefined,
  line2: string | undefined,
  town: string | undefined,
  postcode: string | undefined,
): PostalAddress | null {
  if (line1 === undefined || town === undefined || postcode === undefined) {
    return null;
  }
  const address: PostalAddress = { addressLine1: line1, town, postcode };
  if (line2 !== undefined) {
    address.addressLine2 = line2;
  }
  return address;
}

function pdfLines(invoice: InvoiceResponse): InvoicePdfLine[] {
  if (invoice.lines !== undefined && invoice.lines.length > 0) {
    return invoice.lines.map((line) => ({
      occurredOn: line.occurredOn,
      description: line.description,
      quantity: line.quantity,
      quantityUnit: line.quantityUnit,
      ratePence: line.ratePence,
      amountPence: line.amountPence,
    }));
  }
  return [
    {
      occurredOn: invoice.issuedOn,
      description: invoice.service ?? '',
      quantity: 1,
      quantityUnit: 'session',
      ratePence: invoice.amountPence,
      amountPence: invoice.amountPence,
    },
  ];
}
