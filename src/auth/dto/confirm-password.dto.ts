import { IsNotEmpty, Matches, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { STRING_MAX_LENGTH } from 'src/constants/variables';

export class ConfirmPasswordDto {
    @ApiProperty({
        description: 'User password',
        example: 'Mario0o0o!#$@2252004',
        minLength: 8,
    })
    @IsNotEmpty()
    @MinLength(8)
    @MaxLength(STRING_MAX_LENGTH)
    password: string;
}
