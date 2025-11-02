import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class ChangeLanguageDto {
    @ApiPropertyOptional({
        description: 'New language',
        example: 'ar',
        enum: ['en', 'ar'],
    })
    @IsIn(['en', 'ar'], { message: 'Language must be either "en" or "ar"' })
    language: 'en' | 'ar';
}
