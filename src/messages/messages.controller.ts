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
    ApiUnauthorizedErrorResponse,
} from 'src/decorators/swagger-error-responses.decorator';
import { GetUserId } from '../decorators/get-userId.decorator';
import { ResponseMessage } from '../decorators/response-message.decorator';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../constants/swagger-messages';
import {
    GetMessagesQueryDto,
    SendMessageDto,
    UpdateMessageDto,
    UploadMessageImageDto,
    UploadVoiceNoteDto,
} from './dto';
import {
    delete_message_swagger,
    get_message_reactions_swagger,
    get_messages_swagger,
    send_message_swagger,
    update_message_swagger,
    upload_message_image_swagger,
    upload_voice_note_swagger,
    websocket_docs_swagger,
} from './messages.swagger';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiTags('Messages')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('messages')
export class MessagesController {
    constructor(private readonly messages_service: MessagesService) {}

    @ApiOperation(websocket_docs_swagger.operation)
    @ApiOkResponse(websocket_docs_swagger.responses.success)
    @Get('websocket-docs')
    async socketDocs() {
        return {
            message: 'WebSocket documentation available in Swagger UI',
            namespace: '/messages',
            events: {
                client_to_server: [
                    'join_chat',
                    'leave_chat',
                    'send_message',
                    'update_message',
                    'delete_message',
                    'typing_start',
                    'typing_stop',
                    'get_messages',
                ],
                server_to_client: [
                    'unread_chats_summary',
                    'new_message',
                    'message_updated',
                    'message_deleted',
                    'user_typing',
                    'user_stopped_typing',
                    'joined_chat',
                    'left_chat',
                    'message_sent',
                    'messages_retrieved',
                    'error',
                ],
            },
        };
    }

    @ApiOperation(upload_message_image_swagger.operation)
    @ApiConsumes('multipart/form-data')
    @ApiBody(upload_message_image_swagger.body)
    @ApiCreatedResponse(upload_message_image_swagger.responses.success)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ApiBadRequestErrorResponse(ERROR_MESSAGES.INVALID_FILE_FORMAT)
    @ResponseMessage(SUCCESS_MESSAGES.IMAGE_UPLOADED)
    @Post('images/upload')
    @UseInterceptors(FileInterceptor('file'))
    async uploadMessageImage(
        @UploadedFile() file: Express.Multer.File,
        @GetUserId() user_id: string
    ) {
        return this.messages_service.uploadMessageImage(user_id, file);
    }

    @ApiOperation(send_message_swagger.operation)
    @ApiParam(send_message_swagger.params.chat_id)
    @ApiBody({ type: SendMessageDto })
    @ApiCreatedResponse(send_message_swagger.responses.success)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.CHAT_NOT_FOUND)
    @ApiForbiddenErrorResponse(ERROR_MESSAGES.UNAUTHORIZED_ACCESS_TO_CHAT)
    @ApiBadRequestErrorResponse(ERROR_MESSAGES.MESSAGE_CONTENT_REQUIRED)
    @ResponseMessage(SUCCESS_MESSAGES.MESSAGE_SENT)
    @Post('chats/:chat_id/message')
    async sendMessage(
        @Param('chat_id') chat_id: string,
        @Body() send_message_dto: SendMessageDto,
        @GetUserId() user_id: string
    ) {
        return this.messages_service.sendMessage(user_id, chat_id, send_message_dto);
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
        const result = await this.messages_service.getMessages(user_id, chat_id, query);
        const { next_cursor, has_more, ...response_data } = result;

        return {
            data: {
                chat_id,
                ...response_data,
            },
            pagination: {
                next_cursor,
                has_more,
            },
        };
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
        return this.messages_service.updateMessage(
            user_id,
            chat_id,
            message_id,
            update_message_dto
        );
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
        return this.messages_service.deleteMessage(user_id, chat_id, message_id);
    }

    @ApiOperation(get_message_reactions_swagger.operation)
    @ApiParam(get_message_reactions_swagger.params.chat_id)
    @ApiParam(get_message_reactions_swagger.params.message_id)
    @ApiOkResponse(get_message_reactions_swagger.responses.success)
    @ApiNotFoundErrorResponse(ERROR_MESSAGES.MESSAGE_NOT_FOUND)
    @ApiForbiddenErrorResponse(ERROR_MESSAGES.UNAUTHORIZED_ACCESS_TO_CHAT)
    @ResponseMessage(SUCCESS_MESSAGES.MESSAGE_REACTIONS_RETRIEVED)
    @Get('chats/:chat_id/messages/:message_id/reactions')
    async getMessageReactions(
        @Param('chat_id') chat_id: string,
        @Param('message_id') message_id: string,
        @GetUserId() user_id: string
    ) {
        return this.messages_service.getMessageReactions(user_id, chat_id, message_id);
    }

    @ApiOperation(upload_voice_note_swagger.operation)
    @ApiConsumes('multipart/form-data')
    @ApiBody(upload_voice_note_swagger.body)
    @ApiUnauthorizedErrorResponse(ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN)
    @ApiBadRequestErrorResponse(ERROR_MESSAGES.INVALID_FILE_FORMAT)
    @ResponseMessage(SUCCESS_MESSAGES.IMAGE_UPLOADED)
    @Post('voices/upload')
    @UseInterceptors(FileInterceptor('voice_note'))
    async uploadVoiceNote(
        @UploadedFile() file: Express.Multer.File,
        @Body() body: { duration: string },
        @GetUserId() user_id: string
    ) {
        return this.messages_service.uploadVoiceNote(user_id, file, body.duration);
    }
}
