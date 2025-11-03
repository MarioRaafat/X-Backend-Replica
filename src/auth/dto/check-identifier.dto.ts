import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { STRING_MAX_LENGTH } from 'src/constants/variables';

export class CheckIdentifierDto {
    @ApiProperty({
        description: 'The identifier to check (email, phone number, or username)',
        example: 'mariorafat10@gmail.com',
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(STRING_MAX_LENGTH)
    identifier: string;
}
