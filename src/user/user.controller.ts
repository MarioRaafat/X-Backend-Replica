import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { UserService } from './user.service';
import {
    ApiBearerAuth,
    ApiBody,
    ApiCreatedResponse,
    ApiNoContentResponse,
    ApiOkResponse,
    ApiOperation,
    ApiTags,
} from '@nestjs/swagger';
import {
    ApiBadRequestErrorResponse,
    ApiConflictErrorResponse,
    ApiForbiddenErrorResponse,
    ApiNotFoundErrorResponse,
    ApiUnauthorizedErrorResponse,
} from 'src/decorators/swagger-error-responses.decorator';
import { ResponseMessage } from 'src/decorators/response-message.decorator';
import {
    assign_interests,
    block_user,
    change_phone_number,
    deactivate_account,
    delete_avatar,
    delete_cover,
    follow_user,
    get_blocked,
    get_followers,
    get_following,
    get_liked_posts,
    get_me,
    get_muted,
    get_user_by_id,
    get_user_media,
    get_user_posts,
    get_user_replies,
    get_users_by_ids,
    get_users_by_username,
    mute_user,
    reactivate_account,
    remove_follower,
    unblock_user,
    unfollow_user,
    unmute_user,
    update_user,
    upload_avatar,
    upload_cover,
} from './user.swagger';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from 'src/constants/swagger-messages';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { GetUsersByIdDto } from './dto/get-users-by-id.dto';
import { GetUsersByUsernameDto } from './dto/get-users-by-username.dto';
import { GetFollowersDto } from './dto/get-followers.dto';
import { PaginationParamsDto } from './dto/pagination-params.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdatePhoneNumberDto } from './dto/update_phone_number.dto';
import { GetUserId } from 'src/decorators/get-userId.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { DeleteFileDto } from './dto/delete-file.dto';
import { OptionalJwtAuthGuard } from 'src/auth/guards/optional-jwt.guard';
import { AssignInterestsDto } from './dto/assign-interests.dto';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
export class UserController {
    constructor(private readonly user_service: UserService) {}

    @UseGuards(OptionalJwtAuthGuard)
    @ApiOperation(get_users_by_ids.operation)
    @ApiOkResponse(get_users_by_ids.responses.success)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND)
    @ResponseMessage(SUCCESS_MESSAGES.USERS_RETRIEVED)
    @Post()
    async getUsersByIds(@Body() ids: GetUsersByIdDto) {}

    @UseGuards(OptionalJwtAuthGuard)
    @ApiOperation(get_users_by_username.operation)
    @ApiOkResponse(get_users_by_username.responses.success)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND)
    @ResponseMessage(SUCCESS_MESSAGES.USERS_RETRIEVED)
    @Post('by/username')
    async getUsersByUsernames(@Body() usernames: GetUsersByUsernameDto) {}

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation(get_me.operation)
    @ApiOkResponse(get_me.responses.success)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ResponseMessage(SUCCESS_MESSAGES.USER_RETRIEVED)
    @Get('me')
    async getMe(@GetUserId() user_id: string) {
        return await this.user_service.getMe(user_id);
    }

    @UseGuards(OptionalJwtAuthGuard)
    @ApiOperation(get_user_by_id.operation)
    @ApiOkResponse(get_user_by_id.responses.success)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND)
    @ResponseMessage(SUCCESS_MESSAGES.USER_RETRIEVED)
    @Get(':user_id')
    async getUserById(
        @GetUserId() current_user_id: string | null,
        @Param('user_id') target_user_id: string
    ) {
        return await this.user_service.getUserById(current_user_id, target_user_id);
    }

    @UseGuards(OptionalJwtAuthGuard)
    @ApiOperation(get_users_by_username.operation)
    @ApiOkResponse(get_users_by_username.responses.success)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND)
    @ResponseMessage(SUCCESS_MESSAGES.USER_RETRIEVED)
    @Get('by/username/:username')
    async getUserByUsername(
        @GetUserId() current_user_id: string | null,
        @Param('username') target_username: string
    ) {
        return await this.user_service.getUserByUsername(current_user_id, target_username);
    }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation(get_followers.operation)
    @ApiOkResponse(get_followers.responses.success)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ResponseMessage(SUCCESS_MESSAGES.FOLLOWERS_LIST_RETRIEVED)
    @Get(':user_id/followers')
    async getFollowers(
        @GetUserId() current_user_id: string,
        @Param('user_id') target_user_id: string,
        @Query() query_dto: GetFollowersDto
    ) {
        return await this.user_service.getFollowers(current_user_id, target_user_id, query_dto);
    }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation(remove_follower.operation)
    @ApiOkResponse(remove_follower.responses.success)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ResponseMessage(SUCCESS_MESSAGES.FOLLOWER_REMOVED)
    @Delete(':target_user_id/remove-follower')
    async removeFollower(
        @Param('target_user_id') target_user_id: string,
        @GetUserId() user_id: string
    ) {}

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation(get_following.operation)
    @ApiOkResponse(get_following.responses.success)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ResponseMessage(SUCCESS_MESSAGES.FOLLOWING_LIST_RETRIEVED)
    @Get(':user_id/following')
    async getFollowing(
        @GetUserId() current_user_id: string,
        @Param('user_id') target_user_id: string,
        @Query() query_dto: PaginationParamsDto
    ) {
        return await this.user_service.getFollowing(current_user_id, target_user_id, query_dto);
    }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation(follow_user.operation)
    @ApiCreatedResponse(follow_user.responses.success)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND)
    @ApiBadRequestErrorResponse(ERROR_MESSAGES.CANNOT_FOLLOW_YOURSELF)
    @ApiBadRequestErrorResponse(ERROR_MESSAGES.CANNOT_FOLLOW_BLOCKED_USER)
    @ApiConflictErrorResponse(ERROR_MESSAGES.ALREADY_FOLLOWING)
    @ApiForbiddenErrorResponse(ERROR_MESSAGES.CANNOT_FOLLOW_USER)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ResponseMessage(SUCCESS_MESSAGES.FOLLOW_USER)
    @Post(':target_user_id/follow')
    async followUser(
        @Param('target_user_id') target_user_id: string,
        @GetUserId() current_user_id: string
    ) {
        return await this.user_service.followUser(current_user_id, target_user_id);
    }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation(unfollow_user.operation)
    @ApiOkResponse(unfollow_user.responses.success)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ResponseMessage(SUCCESS_MESSAGES.UNFOLLOW_USER)
    @Delete(':target_user_id/unfollow')
    async unfollowUser(
        @Param('target_user_id') target_user_id: string,
        @GetUserId() current_user_id: string
    ) {
        return await this.user_service.unfollowUser(current_user_id, target_user_id);
    }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation(get_muted.operation)
    @ApiOkResponse(get_muted.responses.success)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ResponseMessage(SUCCESS_MESSAGES.MUTED_LIST_RETRIEVED)
    @Get('me/muted')
    async getMutedList(@Query() query_dto: PaginationParamsDto, @GetUserId() user_id: string) {
        return await this.user_service.getMutedList(user_id, query_dto);
    }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation(mute_user.operation)
    @ApiCreatedResponse(mute_user.responses.success)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND)
    @ApiBadRequestErrorResponse(ERROR_MESSAGES.CANNOT_MUTE_YOURSELF)
    @ApiConflictErrorResponse(ERROR_MESSAGES.ALREADY_MUTED)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ResponseMessage(SUCCESS_MESSAGES.MUTE_USER)
    @Post(':target_user_id/mute')
    async muteUser(
        @Param('target_user_id') target_user_id: string,
        @GetUserId() current_user_id: string
    ) {
        return await this.user_service.muteUser(current_user_id, target_user_id);
    }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation(unmute_user.operation)
    @ApiNoContentResponse(unmute_user.responses.success)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ResponseMessage(SUCCESS_MESSAGES.UNMUTE_USER)
    @Delete(':target_user_id/unmute')
    async unmuteUser(
        @Param('target_user_id') target_user_id: string,
        @GetUserId() current_user_id: string
    ) {
        return await this.user_service.unmuteUser(current_user_id, target_user_id);
    }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation(get_blocked.operation)
    @ApiOkResponse(get_blocked.responses.success)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ResponseMessage(SUCCESS_MESSAGES.BLOCKED_LIST_RETRIEVED)
    @Get('me/blocked')
    async getBlockedList(@Query() query_dto: PaginationParamsDto, @GetUserId() user_id: string) {
        return await this.user_service.getBlockedList(user_id, query_dto);
    }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation(block_user.operation)
    @ApiCreatedResponse(block_user.responses.success)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND)
    @ApiBadRequestErrorResponse(ERROR_MESSAGES.CANNOT_BLOCK_YOURSELF)
    @ApiConflictErrorResponse(ERROR_MESSAGES.ALREADY_BLOCKED)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ResponseMessage(SUCCESS_MESSAGES.BLOCK_USER)
    @Post(':target_user_id/block')
    async blockUser(
        @Param('target_user_id') target_user_id: string,
        @GetUserId() current_user_id: string
    ) {
        return await this.user_service.blockUser(current_user_id, target_user_id);
    }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation(unblock_user.operation)
    @ApiNoContentResponse(unblock_user.responses.success)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ResponseMessage(SUCCESS_MESSAGES.UNBLOCK_USER)
    @Delete(':target_user_id/unblock')
    async unblockUser(
        @Param('target_user_id') target_user_id: string,
        @GetUserId() current_user_id: string
    ) {
        return await this.user_service.unblockUser(current_user_id, target_user_id);
    }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation(get_liked_posts.operation)
    @ApiOkResponse(get_liked_posts.responses.success)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ResponseMessage(SUCCESS_MESSAGES.LIKED_POSTS_RETRIEVED)
    @Get('me/liked-yaps')
    async getLikedYaps(@Query() query_dto: PaginationParamsDto, @GetUserId() user_id: string) {}

    @UseGuards(OptionalJwtAuthGuard)
    @ApiOperation(get_user_posts.operation)
    @ApiOkResponse(get_user_posts.responses.success)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND)
    @ResponseMessage(SUCCESS_MESSAGES.POSTS_RETRIEVED)
    @Get(':userId/posts')
    async getPosts(@Param('userId') user_id: string, @Query() query_dto: PaginationParamsDto) {}

    @UseGuards(OptionalJwtAuthGuard)
    @ApiOperation(get_user_replies.operation)
    @ApiOkResponse(get_user_replies.responses.success)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND)
    @ResponseMessage(SUCCESS_MESSAGES.REPLIES_RETRIEVED)
    @Get(':user_id/replies')
    async getReplies(@Param('user_id') user_id: string, @Query() query_dto: PaginationParamsDto) {}

    @UseGuards(OptionalJwtAuthGuard)
    @ApiOperation(get_user_media.operation)
    @ApiOkResponse(get_user_media.responses.success)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND)
    @ResponseMessage(SUCCESS_MESSAGES.MEDIA_RETRIEVED)
    @Get(':user_id/media')
    async getMedia(@Param('user_id') user_id: string, @Query() query_dto: PaginationParamsDto) {}

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation(update_user.operation)
    @ApiOkResponse(update_user.responses.success)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ResponseMessage(SUCCESS_MESSAGES.USER_UPDATED)
    @Patch('me')
    async updateUser(@Body() update_user_dto: UpdateUserDto, @GetUserId() user_id: string) {}

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation(change_phone_number.operation)
    @ApiOkResponse(change_phone_number.responses.success)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ResponseMessage(SUCCESS_MESSAGES.PHONE_NUMBER_CHANGED)
    @Patch('me/change-phone-number')
    async changePhoneNumber(
        @Body() update_phone_number_dto: UpdatePhoneNumberDto,
        @GetUserId() user_id: string
    ) {}

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation(deactivate_account.operation)
    @ApiOkResponse(deactivate_account.responses.success)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ResponseMessage(SUCCESS_MESSAGES.ACCOUNT_DEACTIVATED)
    @Patch('me/deactivate')
    async deactivateAccount(@GetUserId() user_id: string) {}

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation(reactivate_account.operation)
    @ApiOkResponse(reactivate_account.responses.success)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ResponseMessage(SUCCESS_MESSAGES.ACCOUNT_REACTIVATED)
    @Patch('me/reactivate')
    async reactivateAccount(@GetUserId() user_id: string) {}

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation(upload_avatar.operation)
    @ApiBody(upload_avatar.body)
    @ApiCreatedResponse(upload_avatar.responses.success)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ApiBadRequestErrorResponse(ERROR_MESSAGES.INVALID_FILE_FORMAT)
    @ResponseMessage(SUCCESS_MESSAGES.AVATAR_UPLOADED)
    @Post('me/upload-avatar')
    @UseInterceptors(FileInterceptor('file'))
    async uploadAvatar(@UploadedFile() file: Express.Multer.File) {}

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation(delete_avatar.operation)
    @ApiOkResponse(delete_avatar.responses.success)
    @ApiBody({ type: DeleteFileDto })
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.FILE_NOT_FOUND)
    @ResponseMessage(SUCCESS_MESSAGES.AVATAR_DELETED)
    @Delete('me/delete-avatar')
    async deleteAvatar(@Body() file_url: DeleteFileDto) {}

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation(upload_cover.operation)
    @ApiBody(upload_cover.body)
    @ApiCreatedResponse(upload_cover.responses.success)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ApiBadRequestErrorResponse(ERROR_MESSAGES.INVALID_FILE_FORMAT)
    @ResponseMessage(SUCCESS_MESSAGES.COVER_UPLOADED)
    @Post('me/upload-cover')
    @UseInterceptors(FileInterceptor('file'))
    async uploadCover(@UploadedFile() file: Express.Multer.File) {}

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation(delete_cover.operation)
    @ApiBody({ type: DeleteFileDto })
    @ApiOkResponse(delete_cover.responses.success)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.FILE_NOT_FOUND)
    @ResponseMessage(SUCCESS_MESSAGES.COVER_DELETED)
    @Delete('me/delete-cover')
    async deleteCover(@Body() file_url: DeleteFileDto) {}

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation(assign_interests.operation)
    @ApiBody({ type: AssignInterestsDto })
    @ApiCreatedResponse(assign_interests.responses.success)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.CATEGORY_NOT_FOUND)
    @ResponseMessage(SUCCESS_MESSAGES.INTERESTS_ASSIGNED)
    @Post('me/interests')
    async assignInterests(@Body() assign_interests_dto: AssignInterestsDto) {}
}
