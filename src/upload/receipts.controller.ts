import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { assertOnboarded } from '../auth/assert-onboarded.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { PublicUser } from '../auth/public-user.js';
import { ReceiptUploadFilter } from './receipt-upload.filter.js';
import { ReceiptsService } from './receipts.service.js';
import type { Receipt, ReceiptUrl } from './receipts.service.js';

const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;

@Controller('transactions')
@UseGuards(AuthGuard)
@UseFilters(ReceiptUploadFilter)
export class ReceiptsController {
  constructor(private readonly receiptsService: ReceiptsService) {}

  @Post(':id/receipt')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_RECEIPT_BYTES } }),
  )
  upload(
    @CurrentUser() user: PublicUser,
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<Receipt> {
    assertOnboarded(user);
    return this.receiptsService.upload(user, id, file);
  }

  @Get(':id/receipt')
  link(
    @CurrentUser() user: PublicUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ReceiptUrl> {
    assertOnboarded(user);
    return this.receiptsService.link(user, id);
  }

  @Delete(':id/receipt')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: PublicUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    assertOnboarded(user);
    return this.receiptsService.remove(user, id);
  }
}
