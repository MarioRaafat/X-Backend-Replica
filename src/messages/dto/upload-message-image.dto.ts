import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class UploadMessageImageDto {
    @ApiProperty({
        type: 'string',
        format: 'binary',
        description: 'Image file for the message',
    })
    @IsNotEmpty()
    file: Express.Multer.File;
}
