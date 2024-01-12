import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';

@Injectable()
export class ValidateSeenInteractionStatus implements PipeTransform<string, string> {
  transform(value: string, metadata: ArgumentMetadata): string {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new BadRequestException(`Validation failed. "${metadata.data}" must be a non-empty string.`);
    }
    if (!['liked', 'disliked'].includes(value)) {
      throw new BadRequestException(`Validation failed. "${metadata.data}" must be one of 'liked' or 'disliked'.`);
    }
    return value;
  }
}
