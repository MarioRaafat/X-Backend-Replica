import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseNotificationEntity } from './base-notification.entity';
import { NotificationType } from '../enums/notification-types';

@Schema({ _id: false, timestamps: false })
export class MentionNotificationEntity extends BaseNotificationEntity {
    @Prop({
        type: String,
        enum: NotificationType,
        default: NotificationType.MENTION,
        required: true,
    })
    declare type: NotificationType.MENTION;

    @Prop({ type: String, required: true })
    tweet_id: string;

    @Prop({ type: String, required: false })
    parent_tweet_id?: string;

    @Prop({ type: String, required: true })
    mentioned_by: string;

    @Prop({ type: String, required: true })
    tweet_type: 'tweet' | 'quote' | 'reply';
}

export const MentionNotificationSchema = SchemaFactory.createForClass(MentionNotificationEntity);
