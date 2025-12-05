import { SuggestedQueryDto } from './suggested-query.dto';
import { SuggestedUserDto } from './suggested-user.dto';

export class SuggestionsResponseDto {
    suggested_queries: SuggestedQueryDto[];

    suggested_users: SuggestedUserDto[];
}
