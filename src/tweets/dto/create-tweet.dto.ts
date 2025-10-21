import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateTweetDTO {
    @ApiProperty({
        description: 'The text content of the tweet',
        example: 'This is my first tweet!',
        maxLength: 280,
    })
    @IsString()
    @MaxLength(280)
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
    videos?: string[];
}
