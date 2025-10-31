import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Put,
    Query,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
    ApiBearerAuth,
    ApiBody,
    ApiConsumes,
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
import {
    CreateChatDto,
    GetChatsQueryDto,
    GetMessagesQueryDto,
    MarkMessagesReadDto,
    SearchChatsQueryDto,
    SendMessageDto,
    UpdateMessageDto,
} from './dto';
import {
    create_chat_swagger,
    delete_chat_swagger,
    delete_message_swagger,
    get_chat_swagger,
    get_chats_swagger,
    get_message_swagger,
    get_messages_swagger,
    mark_messages_read_swagger,
    search_chats_swagger,
    send_message_swagger,
    update_message_swagger,
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

    @ApiOperation(search_chats_swagger.operation)
    @ApiQuery({ type: SearchChatsQueryDto })
    @ApiOkResponse(search_chats_swagger.responses.success)
    @ResponseMessage(SUCCESS_MESSAGES.CHATS_RETRIEVED)
    @Get('search')
    async searchChats(@Query() query: SearchChatsQueryDto, @GetUserId() user_id: string) {
        return this.chat_service.searchChats(user_id, query);
    }

    @ApiOperation(get_chat_swagger.operation)
    @ApiParam(get_chat_swagger.params.chat_id)
    @ApiOkResponse(get_chat_swagger.responses.success)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.CHAT_NOT_FOUND)
    @ApiForbiddenErrorResponse(ERROR_MESSAGES.UNAUTHORIZED_ACCESS_TO_CHAT)
    @ResponseMessage(SUCCESS_MESSAGES.CHAT_RETRIEVED)
    @Get('chats/:chat_id')
    async getChat(@Param('chat_id') chat_id: string, @GetUserId() user_id: string) {
        return this.chat_service.getChat(user_id, chat_id);
    }

    @ApiOperation(delete_chat_swagger.operation)
    @ApiParam(delete_chat_swagger.params.chat_id)
    @ApiOkResponse(delete_chat_swagger.responses.success)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.CHAT_NOT_FOUND)
    @ApiForbiddenErrorResponse(ERROR_MESSAGES.UNAUTHORIZED_ACCESS_TO_CHAT)
    @ResponseMessage(SUCCESS_MESSAGES.CHAT_DELETED)
    @Delete('chats/:chat_id')
    async deleteChat(@Param('chat_id') chat_id: string, @GetUserId() user_id: string) {
        return this.chat_service.deleteChat(user_id, chat_id);
    }

    @ApiOperation(send_message_swagger.operation)
    @ApiParam(send_message_swagger.params.chat_id)
    @ApiBody({ type: SendMessageDto })
    @ApiCreatedResponse(send_message_swagger.responses.success)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.CHAT_NOT_FOUND)
    @ApiForbiddenErrorResponse(ERROR_MESSAGES.UNAUTHORIZED_ACCESS_TO_CHAT)
    @ApiBadRequestErrorResponse(ERROR_MESSAGES.MESSAGE_CONTENT_REQUIRED)
    @ResponseMessage(SUCCESS_MESSAGES.MESSAGE_SENT)
    @Post('chats/:chat_id/messages')
    async sendMessage(
        @Param('chat_id') chat_id: string,
        @Body() send_message_dto: SendMessageDto,
        @GetUserId() user_id: string
    ) {
        return this.chat_service.sendMessage(user_id, chat_id, send_message_dto);
    }

    @ApiOperation(get_messages_swagger.operation)
    @ApiParam(get_messages_swagger.params.chat_id)
    @ApiQuery({ type: GetMessagesQueryDto })
    @ApiOkResponse(get_messages_swagger.responses.success)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.CHAT_NOT_FOUND)
    @ApiForbiddenErrorResponse(ERROR_MESSAGES.UNAUTHORIZED_ACCESS_TO_CHAT)
    @ResponseMessage(SUCCESS_MESSAGES.MESSAGES_RETRIEVED)
    @Get('chats/:chat_id/messages')
    async getMessages(
        @Param('chat_id') chat_id: string,
        @Query() query: GetMessagesQueryDto,
        @GetUserId() user_id: string
    ) {
        return this.chat_service.getMessages(user_id, chat_id, query);
    }

    @ApiOperation(get_message_swagger.operation)
    @ApiParam(get_message_swagger.params.chat_id)
    @ApiParam(get_message_swagger.params.message_id)
    @ApiOkResponse(get_message_swagger.responses.success)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.MESSAGE_NOT_FOUND)
    @ApiForbiddenErrorResponse(ERROR_MESSAGES.UNAUTHORIZED_ACCESS_TO_MESSAGE)
    @ResponseMessage(SUCCESS_MESSAGES.MESSAGE_RETRIEVED)
    @Get('chats/:chat_id/messages/:message_id')
    async getMessage(
        @Param('chat_id') chat_id: string,
        @Param('message_id') message_id: string,
        @GetUserId() user_id: string
    ) {
        return this.chat_service.getMessage(user_id, chat_id, message_id);
    }

    @ApiOperation(update_message_swagger.operation)
    @ApiParam(update_message_swagger.params.chat_id)
    @ApiParam(update_message_swagger.params.message_id)
    @ApiBody({ type: UpdateMessageDto })
    @ApiOkResponse(update_message_swagger.responses.success)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.MESSAGE_NOT_FOUND)
    @ApiForbiddenErrorResponse(ERROR_MESSAGES.UNAUTHORIZED_ACCESS_TO_MESSAGE)
    @ApiBadRequestErrorResponse(ERROR_MESSAGES.MESSAGE_CONTENT_REQUIRED)
    @ResponseMessage(SUCCESS_MESSAGES.MESSAGE_UPDATED)
    @Put('chats/:chat_id/messages/:message_id')
    async updateMessage(
        @Param('chat_id') chat_id: string,
        @Param('message_id') message_id: string,
        @Body() update_message_dto: UpdateMessageDto,
        @GetUserId() user_id: string
    ) {
        return this.chat_service.updateMessage(user_id, chat_id, message_id, update_message_dto);
    }

    @ApiOperation(delete_message_swagger.operation)
    @ApiParam(delete_message_swagger.params.chat_id)
    @ApiParam(delete_message_swagger.params.message_id)
    @ApiOkResponse(delete_message_swagger.responses.success)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.MESSAGE_NOT_FOUND)
    @ApiForbiddenErrorResponse(ERROR_MESSAGES.UNAUTHORIZED_ACCESS_TO_MESSAGE)
    @ResponseMessage(SUCCESS_MESSAGES.MESSAGE_DELETED)
    @Delete('chats/:chat_id/messages/:message_id')
    async deleteMessage(
        @Param('chat_id') chat_id: string,
        @Param('message_id') message_id: string,
        @GetUserId() user_id: string
    ) {
        return this.chat_service.deleteMessage(user_id, chat_id, message_id);
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
        @Body() mark_message_read_dto: MarkMessagesReadDto,
        @GetUserId() user_id: string
    ) {
        return this.chat_service.markMessagesAsRead(user_id, chat_id, mark_message_read_dto);
    }
}
