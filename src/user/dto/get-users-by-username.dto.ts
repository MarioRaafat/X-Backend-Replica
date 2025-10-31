import {
    ArrayMaxSize,
    ArrayMinSize,
    ArrayUnique,
    IsArray,
    IsNotEmpty,
    IsString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class GetUsersByUsernameDto {
    @ApiProperty({
        description: 'List of usernames to fetch',
        example: 'alyaa242,amira999',
        type: String,
    })
    @IsNotEmpty()
    @Transform(({ value }) => {
        if (typeof value === 'string') {
            return value
                .split(',')
                .map((username) => username.trim())
                .filter((username) => username.length > 0);
        }
        return value;
    })
    @IsArray()
    @ArrayMinSize(1, { message: 'At least one username must be provided' })
    @ArrayMaxSize(50, { message: 'Maximum 50 usernames allowed' })
    @ArrayUnique()
    @IsString({ each: true, message: 'Each username must be a string' })
    usernames: string[];
}
