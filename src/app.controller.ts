import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  constructor() {
    return;
  }

  @Get('/debug')
  async debug() {
    return;
  }
}
