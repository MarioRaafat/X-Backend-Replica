import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseNotificationEntity } from './base-notification.entity';
import { NotificationType } from '../enums/notification-types';

@Schema({ _id: false, timestamps: false })
export class QuoteNotificationEntity extends BaseNotificationEntity {
    @Prop({ type: String, enum: NotificationType, default: NotificationType.QUOTE, required: true })
    declare type: NotificationType.QUOTE;

    @Prop({ type: String, required: true })
    quote_tweet_id: string;

    @Prop({ type: String, required: true })
    parent_tweet_id: string;

    @Prop({ type: String, required: true })
    quoted_by: string;
}

export const QuoteNotificationSchema = SchemaFactory.createForClass(QuoteNotificationEntity);
