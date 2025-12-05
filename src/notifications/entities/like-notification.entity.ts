import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseNotificationEntity } from './base-notification.entity';
import { NotificationType } from '../enums/notification-types';

@Schema({ _id: false, timestamps: false })
export class LikeNotificationEntity extends BaseNotificationEntity {
    @Prop({ type: String, enum: NotificationType, default: NotificationType.LIKE, required: true })
    declare type: NotificationType.LIKE;

    @Prop({ type: [String], required: true })
    tweet_id: string[];

    @Prop({ type: [String], required: true })
    liked_by: string[];
}

export const LikeNotificationSchema = SchemaFactory.createForClass(LikeNotificationEntity);
