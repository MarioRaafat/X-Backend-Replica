import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseNotificationEntity } from './base-notification.entity';
import { NotificationType } from '../enums/notification-types';

@Schema({ _id: false, timestamps: false })
export class ReplyNotificationEntity extends BaseNotificationEntity {
    @Prop({ type: String, enum: NotificationType, default: NotificationType.REPLY, required: true })
    declare type: NotificationType.REPLY;

    @Prop({ type: String, required: true })
    reply_tweet_id: string;

    @Prop({ type: String, required: true })
    original_tweet_id: string;

    @Prop({ type: String, required: true })
    replied_by: string;

    @Prop({ type: String, required: false })
    conversation_id?: string;
}

export const ReplyNotificationSchema = SchemaFactory.createForClass(ReplyNotificationEntity);
