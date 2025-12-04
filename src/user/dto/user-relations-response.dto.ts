import { Expose } from 'class-transformer';

export class UserRelationsResponseDto {
    @Expose()
    blocked_count: number = 0;

    @Expose()
    muted_count: number = 0;
}
