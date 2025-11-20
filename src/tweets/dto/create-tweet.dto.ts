import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional, IsString, IsUrl, IsUUID, MaxLength } from 'class-validator';
import { LARGE_MAX_LENGTH, POST_CONTENT_LENGTH } from 'src/constants/variables';
import { ReplyRestriction } from 'src/shared/enums/reply-restriction.enum';

export class CreateTweetDTO {
    @ApiProperty({
        description: 'The text content of the tweet',
        example: 'This is my first tweet!',
        maxLength: POST_CONTENT_LENGTH,
    })
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

    @ApiProperty({
        description: 'Who can reply to this tweet',
        enum: ReplyRestriction,
        example: ReplyRestriction.EVERYONE,
        required: false,
        default: ReplyRestriction.EVERYONE,
    })
    @IsOptional()
    @IsEnum(ReplyRestriction)
    reply_restriction?: ReplyRestriction;

    @ApiProperty({
        description: 'Array of user IDs mentioned in this tweet',
        example: ['f84c1e2f-dcb9-4fe8-a31f-7437b722eb3c'],
        required: false,
        type: [String],
    })
    @IsOptional()
    @IsArray()
    @IsUUID('4', { each: true })
    mentions?: string[];
}
