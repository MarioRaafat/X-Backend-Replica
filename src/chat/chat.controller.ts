import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiBody,
    ApiCreatedResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiTags,
} from '@nestjs/swagger';
import {
    ApiBadRequestErrorResponse,
    ApiConflictErrorResponse,
    ApiForbiddenErrorResponse,
    ApiNotFoundErrorResponse,
} from 'src/decorators/swagger-error-responses.decorator';
import { GetUserId } from '../decorators/get-userId.decorator';
import { ResponseMessage } from '../decorators/response-message.decorator';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../constants/swagger-messages';
import { CreateChatDto, GetChatsQueryDto, MarkMessagesReadDto } from './dto';
import {
    create_chat_swagger,
    delete_chat_swagger,
    get_chats_swagger,
    mark_messages_read_swagger,
} from './chat.swagger';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';

@ApiTags('Chat')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
    constructor(private readonly chat_service: ChatService) {}

    @ApiOperation(create_chat_swagger.operation)
    @ApiBody({ type: CreateChatDto })
    @ApiCreatedResponse(create_chat_swagger.responses.success)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.RECIPIENT_NOT_FOUND)
    @ApiBadRequestErrorResponse(ERROR_MESSAGES.CANNOT_MESSAGE_YOURSELF)
    @ApiConflictErrorResponse(ERROR_MESSAGES.CHAT_ALREADY_EXISTS)
    @ResponseMessage(SUCCESS_MESSAGES.CHAT_CREATED)
    @Post()
    async createChat(@Body() create_chat_dto: CreateChatDto, @GetUserId() user_id: string) {
        return this.chat_service.createChat(user_id, create_chat_dto);
    }

    @ApiOperation(get_chats_swagger.operation)
    @ApiQuery({ type: GetChatsQueryDto })
    @ApiOkResponse(get_chats_swagger.responses.success)
    @ResponseMessage(SUCCESS_MESSAGES.CHATS_RETRIEVED)
    @Get()
    async getChats(@Query() query: GetChatsQueryDto, @GetUserId() user_id: string) {
        return this.chat_service.getChats(user_id, query);
    }

    @ApiOperation(mark_messages_read_swagger.operation)
    @ApiParam(mark_messages_read_swagger.params.chat_id)
    @ApiBody({ type: MarkMessagesReadDto })
    @ApiOkResponse(mark_messages_read_swagger.responses.success)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.CHAT_NOT_FOUND)
    @ApiForbiddenErrorResponse(ERROR_MESSAGES.UNAUTHORIZED_ACCESS_TO_CHAT)
    @ResponseMessage(SUCCESS_MESSAGES.MESSAGE_READ_STATUS_UPDATED)
    @Post('chats/:chat_id/read')
    async markMessagesAsRead(
        @Param('chat_id') chat_id: string,
        @Body() mark_messages_read_dto: MarkMessagesReadDto,
        @GetUserId() user_id: string
    ) {
        return this.chat_service.markMessagesAsRead(user_id, chat_id, mark_messages_read_dto);
    }
}
