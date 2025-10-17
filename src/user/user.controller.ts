import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
} from '@nestjs/swagger';
import {
  ApiUnauthorizedErrorResponse,
  ApiNotFoundErrorResponse,
} from 'src/decorators/swagger-error-responses.decorator';
import { ResponseMessage } from 'src/decorators/response-message.decorator';
import {
  block_user,
  change_phone_number,
  deactivate_account,
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
} from './user.swagger';
import {
  SUCCESS_MESSAGES,
  ERROR_MESSAGES,
} from 'src/constants/swagger-messages';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { GetUsersByIdDto } from './dto/get-users-by-id.dto';
import { GetUsersByUsernameDto } from './dto/get-users-by-username.dto';
import { GetFollowersDto } from './dto/get-followers.dto';
import { PaginationParamsDto } from './dto/pagination-params.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdatePhoneNumberDto } from './dto/update_phone_number.dto';
import { GetUserId } from 'src/decorators/get-userId.decorator';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
export class UserController {
  constructor(private readonly user_service: UserService) {}

  @ApiOperation(get_users_by_ids.operation)
  @ApiOkResponse(get_users_by_ids.responses.success)
  @ApiNotFoundErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND)
  @ResponseMessage(SUCCESS_MESSAGES.USERS_RETRIEVED)
  @Post()
  async getUsersByIds(@Body() ids: GetUsersByIdDto) {}

  @ApiOperation(get_users_by_username.operation)
  @ApiOkResponse(get_users_by_username.responses.success)
  @ApiNotFoundErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND)
  @ResponseMessage(SUCCESS_MESSAGES.USERS_RETRIEVED)
  @Post('by/username')
  async getUsersByUsernames(@Body() usernames: GetUsersByUsernameDto) {}

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation(get_me.operation)
  @ApiOkResponse(get_me.responses.success)
  @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
  @ResponseMessage(SUCCESS_MESSAGES.USER_RETRIEVED)
  @Get('me')
  async getMe(@GetUserId() user_id: string) {}

  @ApiOperation(get_user_by_id.operation)
  @ApiOkResponse(get_user_by_id.responses.success)
  @ApiNotFoundErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND)
  @ResponseMessage(SUCCESS_MESSAGES.USER_RETRIEVED)
  @Get(':userId')
  async getUserById(@Param('userId') user_id: string) {}

  @ApiOperation(get_users_by_username.operation)
  @ApiOkResponse(get_users_by_username.responses.success)
  @ApiNotFoundErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND)
  @ResponseMessage(SUCCESS_MESSAGES.USER_RETRIEVED)
  @Get('by/username/:username')
  async getUserByUsername(@Param('username') username: string) {}

  @ApiOperation(get_followers.operation)
  @ApiOkResponse(get_followers.responses.success)
  @ApiNotFoundErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND)
  @ResponseMessage(SUCCESS_MESSAGES.FOLLOWERS_LIST_RETRIEVED)
  @Get(':userId/followers')
  async getFollowers(
    @Param('id') id: string,
    @Query() query_dto: GetFollowersDto,
  ) {}

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation(remove_follower.operation)
  @ApiOkResponse(remove_follower.responses.success)
  @ApiNotFoundErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND)
  @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
  @ResponseMessage(SUCCESS_MESSAGES.FOLLOWER_REMOVED)
  @Delete(':targetUserId/remove-follower')
  async removeFollower(
    @Param('targetUserId') target_user_id: string,
    @GetUserId() user_id: string,
  ) {}

  @ApiOperation(get_following.operation)
  @ApiOkResponse(get_following.responses.success)
  @ApiNotFoundErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND)
  @ResponseMessage(SUCCESS_MESSAGES.FOLLOWING_LIST_RETRIEVED)
  @Get(':userId/following')
  async getFollowing(
    @Param('id') id: string,
    @Query() query_dto: PaginationParamsDto,
  ) {}

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation(follow_user.operation)
  @ApiOkResponse(follow_user.responses.success)
  @ApiNotFoundErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND)
  @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
  @ResponseMessage(SUCCESS_MESSAGES.FOLLOW_USER)
  @Post(':targetUserId/follow')
  async followUser(
    @Param('targetUserId') target_user_id: string,
    @GetUserId() user_id: string,
  ) {}

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation(unfollow_user.operation)
  @ApiOkResponse(unfollow_user.responses.success)
  @ApiNotFoundErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND)
  @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
  @ResponseMessage(SUCCESS_MESSAGES.UNFOLLOW_USER)
  @Delete(':targetUserId/unfollow')
  async unfollowUser(
    @Param('targetUserId') target_user_id: string,
    @GetUserId() user_id: string,
  ) {}

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation(get_muted.operation)
  @ApiOkResponse(get_muted.responses.success)
  @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
  @ResponseMessage(SUCCESS_MESSAGES.MUTED_LIST_RETRIEVED)
  @Get('me/muted')
  async getMutingList(
    @Query() query_dto: PaginationParamsDto,
    @GetUserId() user_id: string,
  ) {}

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation(mute_user.operation)
  @ApiOkResponse(mute_user.responses.success)
  @ApiNotFoundErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND)
  @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
  @ResponseMessage(SUCCESS_MESSAGES.MUTE_USER)
  @Post(':targetUserId/mute')
  async muteUser(
    @Param('targetUserId') target_user_id: string,
    @GetUserId() user_id: string,
  ) {}

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation(unmute_user.operation)
  @ApiOkResponse(unmute_user.responses.success)
  @ApiNotFoundErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND)
  @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
  @ResponseMessage(SUCCESS_MESSAGES.UNMUTE_USER)
  @Delete(':targetUserId/unmute')
  async unmuteUser(
    @Param('targetUserId') target_user_id: string,
    @GetUserId() user_id: string,
  ) {}

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation(get_blocked.operation)
  @ApiOkResponse(get_blocked.responses.success)
  @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
  @ResponseMessage(SUCCESS_MESSAGES.BLOCKED_LIST_RETRIEVED)
  @Get('me/blocked')
  async getBlockingList(
    @Query() query_dto: PaginationParamsDto,
    @GetUserId() user_id: string,
  ) {}

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation(block_user.operation)
  @ApiOkResponse(block_user.responses.success)
  @ApiNotFoundErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND)
  @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
  @ResponseMessage(SUCCESS_MESSAGES.BLOCK_USER)
  @Post(':targetUserId/block')
  async blockUser(
    @Param('targetUserId') target_user_id: string,
    @GetUserId() user_id: string,
  ) {}

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation(unblock_user.operation)
  @ApiOkResponse(unblock_user.responses.success)
  @ApiNotFoundErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND)
  @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
  @ResponseMessage(SUCCESS_MESSAGES.UNBLOCK_USER)
  @Delete(':targetUserId/unblock')
  async unblockUser(
    @Param('targetUserId') target_user_id: string,
    @GetUserId() user_id: string,
  ) {}

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation(get_liked_posts.operation)
  @ApiOkResponse(get_liked_posts.responses.success)
  @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
  @ResponseMessage(SUCCESS_MESSAGES.LIKED_POSTS_RETRIEVED)
  @Get('me/liked-yaps')
  async getLikedYaps(
    @Query() query_dto: PaginationParamsDto,
    @GetUserId() user_id: string,
  ) {}

  @ApiOperation(get_user_posts.operation)
  @ApiOkResponse(get_user_posts.responses.success)
  @ApiNotFoundErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND)
  @ResponseMessage(SUCCESS_MESSAGES.POSTS_RETRIEVED)
  @Get(':userId/posts')
  async getPosts(
    @Param('userId') user_id: string,
    @Query() query_dto: PaginationParamsDto,
  ) {}

  @ApiOperation(get_user_replies.operation)
  @ApiOkResponse(get_user_replies.responses.success)
  @ApiNotFoundErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND)
  @ResponseMessage(SUCCESS_MESSAGES.REPLIES_RETRIEVED)
  @Get(':userId/replies')
  async getReplies(
    @Param('userId') user_id: string,
    @Query() query_dto: PaginationParamsDto,
  ) {}

  @ApiOperation(get_user_media.operation)
  @ApiOkResponse(get_user_media.responses.success)
  @ApiNotFoundErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND)
  @ResponseMessage(SUCCESS_MESSAGES.MEDIA_RETRIEVED)
  @Get(':userId/media')
  async getMedia(
    @Param('userId') user_id: string,
    @Query() query_dto: PaginationParamsDto,
  ) {}

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation(update_user.operation)
  @ApiOkResponse(update_user.responses.success)
  @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
  @ResponseMessage(SUCCESS_MESSAGES.USER_UPDATED)
  @Patch('me')
  async updateUser(
    @Body() update_user_dto: UpdateUserDto,
    @GetUserId() user_id: string,
  ) {}

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation(change_phone_number.operation)
  @ApiOkResponse(change_phone_number.responses.success)
  @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
  @ResponseMessage(SUCCESS_MESSAGES.PHONE_NUMBER_CHANGED)
  @Patch('me/change-phone-number')
  async changePhoneNumber(
    @Body() update_phone_number_dto: UpdatePhoneNumberDto,
    @GetUserId() user_id: string,
  ) {}

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation(deactivate_account.operation)
  @ApiOkResponse(deactivate_account.responses.success)
  @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
  @ResponseMessage(SUCCESS_MESSAGES.ACCOUNT_DEACTIVATED)
  @Patch('me/deactivate')
  async deactivateAccount(@GetUserId() user_id: string) {}

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation(reactivate_account.operation)
  @ApiOkResponse(reactivate_account.responses.success)
  @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
  @ResponseMessage(SUCCESS_MESSAGES.ACCOUNT_REACTIVATED)
  @Patch('me/reactivate')
  async reactivateAccount(@GetUserId() user_id: string) {}
}
