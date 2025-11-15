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

export class GetUsersByIdDto {
    @ApiProperty({
        description: 'List of user IDs to fetch',
        example: '0c059899-f706-4c8f-97d7-ba2e9fc22d6d,0b064811-f706-4c8f-97d7-ba2e9fc22d6d',
        type: String,
    })
    @IsNotEmpty()
    @Transform(({ value }) => {
        if (typeof value === 'string') {
            return value
                .split(',')
                .map((id) => id.trim())
                .filter((id) => id.length > 0 && id.length <= 50);
        }
        return value;
    })
    @IsArray()
    @ArrayMinSize(1, { message: 'At least one user ID must be provided' })
    @ArrayMaxSize(50, { message: 'Maximum 50 user IDs allowed' })
    @ArrayUnique()
    @IsString({ each: true, message: 'Each user ID must be a string' })
    ids: string[];
}
