import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray, IsOptional, MaxLength, IsUrl } from 'class-validator';

export class CreateQuoteDTO {
    @ApiProperty({
        description: 'The text content for the quote tweet',
        example: 'This is exactly what I was thinking!',
        maxLength: 280,
    })
    @IsString()
    @MaxLength(280)
    content: string;

    @ApiProperty({
        description: 'Array of image URLs attached to the quote',
        example: ['https://example.com/image1.jpg'],
        required: false,
        type: [String],
    })
    @IsOptional()
    @IsArray()
    @IsUrl({}, { each: true })
    images?: string[];

    @ApiProperty({
        description: 'Array of video URLs attached to the quote',
        example: ['https://example.com/video1.mp4'],
        required: false,
        type: [String],
    })
    @IsOptional()
    @IsArray()
    @IsUrl({}, { each: true })
    videos?: string[];
}
