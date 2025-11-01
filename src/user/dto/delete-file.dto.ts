import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUrl } from 'class-validator';

export class DeleteFileDto {
    @ApiProperty({
        description: 'The full URL of the file to delete',
        example:
            'https://yapperdev.blob.core.windows.net/profile-images/3cda6108-8cb6-411b-9457-fbd8ffbf77ee-1761902534288-kurosensi.png',
    })
    @IsString()
    @IsUrl()
    @IsNotEmpty()
    file_url: string;
}
