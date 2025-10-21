import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUrl } from 'class-validator';

export class DeleteFileDto {
    @ApiProperty({
        description: 'The full URL of the file to delete',
        example: 'https://yourdomain.com/uploads/avatar-1697654321000.jpg',
    })
    @IsString()
    @IsUrl()
    file_url: string;
}
