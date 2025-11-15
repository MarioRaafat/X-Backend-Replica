import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { STRING_MAX_LENGTH } from 'src/constants/variables';

export class ForgetPasswordDto {
    // email - username - phone_number
    @ApiProperty({
        description: 'User identifier which can be email, username, or phone number',
        example: 'mariorafat10@gmail.com',
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(STRING_MAX_LENGTH)
    identifier: string;
}
