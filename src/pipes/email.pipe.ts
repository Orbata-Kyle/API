import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import * as validator from 'validator';

@Injectable()
export class ValidateEmailPipe implements PipeTransform<string, string> {
  transform(value: string, metadata: ArgumentMetadata): string {
    if (typeof value !== 'string' || value.trim() === '' || validator.default.isEmail(value) === false) {
      throw new BadRequestException(`Validation failed. "${metadata.data}" must be a non-empty string of an email.`);
    }
    return value;
  }
}
