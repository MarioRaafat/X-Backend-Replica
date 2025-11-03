import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUrl, MaxLength } from 'class-validator';

export class DeleteFileDto {
    @ApiProperty({
        description: 'The full URL of the file to delete',
        example: 'https://yourdomain.com/uploads/avatar-1697654321000.jpg',
    })
    @IsString()
    @MaxLength(500)
    @IsUrl()
    file_url: string;
}
