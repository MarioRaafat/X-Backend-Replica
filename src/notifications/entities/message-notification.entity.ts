import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseNotificationEntity } from './base-notification.entity';
import { NotificationType } from '../enums/notification-types';

@Schema({ _id: false, timestamps: false })
export class MessageNotificationEntity extends BaseNotificationEntity {
    @Prop({
        type: String,
        enum: NotificationType,
        default: NotificationType.MESSAGE,
        required: true,
    })
    declare type: NotificationType.MESSAGE;

    @Prop({ type: String, required: true })
    message_id: string;

    @Prop({ type: String, required: true })
    sent_by: string;

    @Prop({ type: String, required: true })
    chat_id: string;
}

export const MessageNotificationSchema = SchemaFactory.createForClass(MessageNotificationEntity);
