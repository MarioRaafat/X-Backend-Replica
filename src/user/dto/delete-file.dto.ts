import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUrl, MaxLength } from 'class-validator';
import { LARGE_MAX_LENGTH } from 'src/constants/variables';

export class DeleteFileDto {
    @ApiProperty({
        description: 'The full URL of the file to delete',
        example:
            'https://yapperdev.blob.core.windows.net/profile-images/3cda6108-8cb6-411b-9457-fbd8ffbf77ee-1761902534288-kurosensi.png',
    })
    @IsString()
    @MaxLength(LARGE_MAX_LENGTH)
    @IsUrl()
    @IsNotEmpty()
    file_url: string;
}
