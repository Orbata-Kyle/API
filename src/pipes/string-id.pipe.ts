import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';

@Injectable()
export class ValidateStringIdPipe implements PipeTransform<string, string> {
  transform(value: string, metadata: ArgumentMetadata): string {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new BadRequestException(`Validation failed. "${metadata.data}" must be a non-empty string.`);
    }
    return value;
  }
}
