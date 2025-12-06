import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseNotificationEntity } from './base-notification.entity';
import { NotificationType } from '../enums/notification-types';

@Schema({ _id: false, timestamps: false })
export class FollowNotificationEntity extends BaseNotificationEntity {
    @Prop({
        type: String,
        enum: NotificationType,
        default: NotificationType.FOLLOW,
        required: true,
    })
    declare type: NotificationType.FOLLOW;

    @Prop({ type: [String], required: true })
    follower_id: string[];
}

export const FollowNotificationSchema = SchemaFactory.createForClass(FollowNotificationEntity);
