import { IsArray, IsInt } from 'class-validator';

export class AssignInterestsDto {
    @IsArray()
    @IsInt({ each: true })
    category_ids: number[];
}
