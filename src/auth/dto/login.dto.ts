import { IsIn, IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDTO {
    @ApiProperty({
        description: 'User email address',
        example: 'bahgot@example.com',
        format: 'email',
    })
    @IsString()
    @IsNotEmpty()
    identifier: string;

    @ApiProperty({
        description: 'Type of identifier used for login',
        example: 'email',
    })
    @IsString()
    @IsNotEmpty()
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
    @MinLength(8)
    @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
        message:
            'Password must contain at least one uppercase letter, one lowercase letter, and one number or special character',
    })
    password: string;
}
