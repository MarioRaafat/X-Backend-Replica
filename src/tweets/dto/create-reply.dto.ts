import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';
import { LARGE_MAX_LENGTH, POST_CONTENT_LENGTH } from 'src/constants/variables';

export class CreateReplyDTO {
    @ApiProperty({
        description: 'The text content of the reply',
        example: 'Great tweet! I totally agree.',
        maxLength: POST_CONTENT_LENGTH,
    })
    @IsString()
    @MaxLength(POST_CONTENT_LENGTH)
    content: string;

    @ApiProperty({
        description: 'Array of image URLs attached to the reply',
        example: ['https://example.com/image1.jpg'],
        required: false,
        type: [String],
    })
    @IsOptional()
    @IsArray()
    @IsUrl({}, { each: true })
    @MaxLength(LARGE_MAX_LENGTH, { each: true })
    images?: string[];

    @ApiProperty({
        description: 'Array of video URLs attached to the reply',
        example: ['https://example.com/video1.mp4'],
        required: false,
        type: [String],
    })
    @IsOptional()
    @IsArray()
    @IsUrl({}, { each: true })
    @MaxLength(LARGE_MAX_LENGTH, { each: true })
    videos?: string[];
}
