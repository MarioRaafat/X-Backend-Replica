import { ApiProperty } from '@nestjs/swagger';

export class UploadMediaResponseDTO {
    @ApiProperty({
        description: 'The URL of the uploaded media file',
        example: 'https://example.com/uploads/1234567890-image.jpg',
    })
    url: string;

    @ApiProperty({
        description: 'The original filename of the uploaded media',
        example: 'vacation-photo.jpg',
    })
    filename: string;

    @ApiProperty({
        description: 'The size of the uploaded file in bytes',
        example: 1024000,
    })
    size: number;

    @ApiProperty({
        description: 'The MIME type of the uploaded file',
        example: 'image/jpeg',
    })
    mime_type: string;
}
