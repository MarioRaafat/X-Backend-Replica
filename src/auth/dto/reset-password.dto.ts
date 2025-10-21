import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class ResetPasswordDto {
    @ApiProperty({
        description: 'The secure reset token received after OTP verification',
        example:
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJwdXJwb3NlIjoicGFzc3dvcmQtcmVzZXQiLCJpYXQiOjE2MzIxNjE2MDAsImV4cCI6MTYzMjE2MjUwMH0...',
        type: String,
    })
    @IsString({ message: 'Reset token must be a string' })
    @IsNotEmpty({ message: 'Reset token is required' })
    reset_token: string;

    @ApiProperty({
        description:
            'New password - must contain at least one uppercase letter, one lowercase letter, and one number or special character',
        example: 'Mario0o0o!#$@2252004',
        minLength: 8,
    })
    @IsNotEmpty()
    @MinLength(8)
    @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
        message:
            'Password must contain at least one uppercase letter, one lowercase letter, and one number or special character',
    })
    new_password: string;
}
