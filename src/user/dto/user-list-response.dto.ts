import { UserListItemDto } from './user-list-item.dto';

export class UserListResponseDto {
    data: UserListItemDto[];
    next_cursor: string | null;
    has_more: boolean;
}
