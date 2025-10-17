import { ApiProperty } from '@nestjs/swagger';

export class PaginationMeta {
  @ApiProperty({
    example: 'dHdlZXQ6MTg1NjAxOTMyNzQzOQ==',
    description: 'Cursor for next page (null if no more pages)',
  })
  next_cursor: string | null;

  @ApiProperty({
    example: true,
    description: 'Whether more tweets are available',
  })
  has_more: boolean;
}
