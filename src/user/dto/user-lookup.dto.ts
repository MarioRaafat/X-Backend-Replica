import { UserListItemDto } from './user-list-item.dto';

export class UserLookupDto {
    identifier: string;
    success: boolean;
    user: UserListItemDto | null;
}
