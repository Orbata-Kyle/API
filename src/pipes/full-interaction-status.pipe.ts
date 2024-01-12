import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';

@Injectable()
export class ValidateFullInteractionStatus implements PipeTransform<string, string> {
  transform(value: string, metadata: ArgumentMetadata): string {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new BadRequestException(`Validation failed. "${metadata.data}" must be a non-empty string.`);
    }
    if (!['liked', 'disliked', 'unseen'].includes(value)) {
      throw new BadRequestException(`Validation failed. "${metadata.data}" must be one of 'liked', 'disliked', or 'unseen'.`);
    }
    return value;
  }
}
