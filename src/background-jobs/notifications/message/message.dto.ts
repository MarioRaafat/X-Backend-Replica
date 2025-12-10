import { Message } from 'src/messages/entities/message.entity';

export class MessageBackGroundNotificationJobDTO {
    message?: Message;
    message_id?: string;
    chat_id: string;

    sent_by: string;
    sent_to: string;
}
