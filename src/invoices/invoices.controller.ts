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
import { buildInvoicePdf } from './invoice-pdf.js';
import { InvoicesService } from './invoices.service.js';
import type {
  InvoiceListResponse,
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

  @Get(':id/pdf')
  async pdf(
    @CurrentUser() user: PublicUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<StreamableFile> {
    const invoice = await this.invoicesService.findOne(user, id);
    const bytes = await buildInvoicePdf({
      therapistName: user.name,
      number: invoice.number,
      issuedOn: invoice.issuedOn,
      clientName: invoice.clientName,
      service: invoice.service,
      amountPence: invoice.amountPence,
      status: invoice.status,
      paidOn: invoice.paidOn,
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
