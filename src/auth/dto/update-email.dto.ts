import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, MaxLength } from 'class-validator';
import { STRING_MAX_LENGTH } from 'src/constants/variables';

export class UpdateEmailDto {
    @ApiProperty({
        description: 'New email address for the user',
        example: 'newemail@example.com',
        type: String,
    })
    @IsEmail()
    @IsNotEmpty()
    @MaxLength(STRING_MAX_LENGTH)
    new_email: string;
}
