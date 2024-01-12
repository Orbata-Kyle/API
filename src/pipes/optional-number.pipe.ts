import { ArgumentMetadata, Injectable, ParseIntPipe } from '@nestjs/common';

@Injectable()
export class OptionalParseIntPipe extends ParseIntPipe {
  async transform(value: string, metadata: ArgumentMetadata): Promise<number> {
    if (value === undefined) {
      return undefined;
    }
    return super.transform(value, metadata);
  }
}
