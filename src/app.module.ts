import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { TherataxController } from './theratax/theratax.controller.js';

@Module({
  imports: [],
  controllers: [AppController, TherataxController],
  providers: [AppService],
})
export class AppModule {}
