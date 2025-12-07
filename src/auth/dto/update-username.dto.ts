import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { STRING_MAX_LENGTH, USERNAME_MAX_LENGTH } from 'src/constants/variables';

export class UpdateUsernameDto {
    @ApiProperty({
        description: 'New username for the user',
        example: 'mario_raafat123',
        minLength: 3,
        maxLength: 30,
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(3)
    @MaxLength(USERNAME_MAX_LENGTH)
    @Matches(/^[a-zA-Z0-9_]+$/, {
        message: 'Username can only contain letters, numbers, and underscores',
    })
    username: string;
}
