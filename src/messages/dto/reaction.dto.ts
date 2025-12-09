import { IsNotEmpty, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddReactionDto {
    @ApiProperty({
        description: 'Emoji reaction (supports Unicode emojis)',
        example: '😀',
    })
    @IsString()
    @IsNotEmpty()
    @Length(1, 10)
    emoji: string;
}

export class RemoveReactionDto {
    @ApiProperty({
        description: 'Emoji reaction to remove',
        example: '😀',
    })
    @IsString()
    @IsNotEmpty()
    @Length(1, 10)
    emoji: string;
}
