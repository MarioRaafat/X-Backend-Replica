import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { CreateTweetDTO } from "./create-tweet.dto";

export class CreateTweetWithQuoteDTO extends CreateTweetDTO {
    @ApiProperty({
        description: 'Additional commentary for the quote tweet',
        example: 'I totally agree with this! Here is why...',
        maxLength: 280,
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(280)
    extra_content: string;
}
