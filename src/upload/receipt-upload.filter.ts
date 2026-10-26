import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  PayloadTooLargeException,
} from '@nestjs/common';
import type { Response } from 'express';
import { MulterError } from 'multer';

export const RECEIPT_FILE_MESSAGE = 'Receipt must be an image up to 10 MiB';

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
