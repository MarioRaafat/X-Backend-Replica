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
import { GetMessagesQueryDto, SendMessageDto, UpdateMessageDto } from './dto';
import {
    delete_message_swagger,
    get_messages_swagger,
    send_message_swagger,
    update_message_swagger,
} from './messages.swagger';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';

@ApiTags('Messages')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('messages')
export class MessagesController {
    constructor(private readonly messages_service: MessagesService) {}

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
        return this.messages_service.getMessages(user_id, chat_id, query);
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
}
