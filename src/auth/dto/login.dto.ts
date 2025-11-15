import { IsIn, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { STRING_MAX_LENGTH } from 'src/constants/variables';

export class LoginDTO {
    @ApiProperty({
        description: 'User email address',
        example: 'bahgot@example.com',
        format: 'email',
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(STRING_MAX_LENGTH)
    identifier: string;

    @ApiProperty({
        description: 'Type of identifier used for login',
        example: 'email',
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(STRING_MAX_LENGTH)
    @IsIn(['email', 'phone_number', 'username'], {
        message: 'Type must be one of: email, phone_number, or username',
    })
    type: string;

    @ApiProperty({
        description:
            'User password - must contain at least one uppercase letter, one lowercase letter, and one number or special character',
        example: 'Mario0o0o!#$@2252004',
        minLength: 8,
    })
    @IsNotEmpty()
    @MaxLength(STRING_MAX_LENGTH)
    password: string;
}
