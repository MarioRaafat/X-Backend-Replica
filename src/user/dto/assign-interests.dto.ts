import { ArrayUnique, IsArray, IsInt } from 'class-validator';

export class AssignInterestsDto {
    @IsArray()
    @ArrayUnique()
    @IsInt({ each: true })
    category_ids: number[];
}
