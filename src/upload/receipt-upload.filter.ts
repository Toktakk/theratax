import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  PayloadTooLargeException,
} from '@nestjs/common';
import type { Response } from 'express';
import { MulterError } from 'multer';
import { RECEIPT_FILE_MESSAGE } from './receipt-limits.js';

@Catch(MulterError, PayloadTooLargeException)
export class ReceiptUploadFilter implements ExceptionFilter {
  catch(
    _exception: MulterError | PayloadTooLargeException,
    host: ArgumentsHost,
  ): void {
    const response = host.switchToHttp().getResponse<Response>();
    const error = new BadRequestException(RECEIPT_FILE_MESSAGE);
    response.status(error.getStatus()).json(error.getResponse());
  }
}
