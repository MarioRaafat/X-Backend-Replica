import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { STRING_MAX_LENGTH } from 'src/constants/variables';

export class ResetPasswordDto {
    @ApiProperty({
        description: 'The secure reset token received after OTP verification',
        example:
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJwdXJwb3NlIjoicGFzc3dvcmQtcmVzZXQiLCJpYXQiOjE2MzIxNjE2MDAsImV4cCI6MTYzMjE2MjUwMH0...',
        type: String,
    })
    @IsString({ message: 'Reset token must be a string' })
    @IsNotEmpty({ message: 'Reset token is required' })
    @MaxLength(500)
    reset_token: string;

    @ApiProperty({
        description:
            'New password - must contain at least one uppercase letter, one lowercase letter, and one number or special character',
        example: 'Mario0o0o!#$@2252004',
        minLength: 8,
    })
    @IsNotEmpty()
    @MinLength(8)
    @MaxLength(STRING_MAX_LENGTH)
    @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
        message:
            'Password must contain at least one uppercase letter, one lowercase letter, and one number or special character',
    })
    new_password: string;

    @ApiProperty({
        description: 'The identifier (email or username) of the user resetting the password',
        example: 'lionel_messi10@gmail.com',
        type: String,
    })
    @IsString({ message: 'Identifier must be a string' })
    @IsNotEmpty({ message: 'Identifier is required' })
    @MaxLength(STRING_MAX_LENGTH)
    identifier: string;
}
