import { ApiProperty } from '@nestjs/swagger';

export class RepostedByUserDTO {
    @ApiProperty({
        description: 'Repost ID',
        example: '650e8400-e29b-41d4-a716-446655440001',
    })
    repost_id: string;

    @ApiProperty({
        description: 'User ID who reposted',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    id: string;

    @ApiProperty({
        description: 'User display name',
        example: 'John Doe',
    })
    name: string;

    @ApiProperty({
        description: 'Username',
        example: 'John123',
    })
    username: string;

    @ApiProperty({
        description: 'When the tweet was reposted (ISO 8601 timestamp)',
        example: '2025-10-31T12:00:00.000Z',
    })
    reposted_at: Date;
}
