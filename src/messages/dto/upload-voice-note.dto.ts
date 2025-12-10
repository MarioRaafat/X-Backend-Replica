import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class UploadVoiceNoteDto {
    @ApiProperty({
        type: 'string',
        format: 'binary',
        description: 'Voice note audio file (MP3, WAV, OGG, M4A)',
    })
    @IsNotEmpty()
    file: Express.Multer.File;

    @ApiProperty({
        description: 'Duration of voice note in MM:SS format (e.g., "4:33")',
        example: '4:33',
        pattern: '^\\d{1,3}:\\d{2}$',
    })
    @IsNotEmpty()
    @IsString()
    @Matches(/^\d{1,3}:\d{2}$/, {
        message: 'Duration must be in MM:SS format (e.g., "4:33")',
    })
    duration: string;
}
