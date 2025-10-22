import { PartialType } from '@nestjs/swagger';
import { CreateTweetDTO } from './create-tweet.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateTweetWithQuoteDTO extends PartialType(CreateTweetDTO) {
    @ApiProperty({
        description: 'The ID of the tweet being quoted',
        example: 'eac6f8f2-b15d-4a38-8a99-7bfb792a1ad1',
        required: false,
    })
    @IsOptional()
    @IsString()
    quoted_tweet_id?: string;
}
