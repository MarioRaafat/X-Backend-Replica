import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';
import { LARGE_MAX_LENGTH, POST_CONTENT_LENGTH } from 'src/constants/variables';

export class CreateTweetDTO {
    @ApiProperty({
        description: 'The text content of the tweet',
        example: 'This is my first tweet!',
        maxLength: POST_CONTENT_LENGTH,
    })
    // @Transform(({ value }) => value.trim().replace(/@([a-zA-Z0-9_]+)/g, ''))
    @IsString()
    @MaxLength(POST_CONTENT_LENGTH)
    content: string;

    @ApiProperty({
        description: 'Array of image URLs attached to the tweet',
        example: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
        required: false,
        type: [String],
    })
    @IsOptional()
    @IsArray()
    @IsUrl({}, { each: true })
    @MaxLength(LARGE_MAX_LENGTH, { each: true })
    images?: string[];

    @ApiProperty({
        description: 'Array of video URLs attached to the tweet',
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
