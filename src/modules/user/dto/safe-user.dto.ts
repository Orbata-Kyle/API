import { ApiProperty } from '@nestjs/swagger';

export class SafeUserDto {
  @ApiProperty({ type: Number, example: 1 })
  id: number;

  @ApiProperty({ type: String, example: 'John' })
  firstName: string;

  @ApiProperty({ type: String, example: 'Doe' })
  lastName: string;

  @ApiProperty({ type: String, example: 'user@example.com' })
  email: string;

  @ApiProperty({ type: Boolean, example: false })
  admin: boolean;
}
