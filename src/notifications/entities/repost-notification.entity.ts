import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseNotificationEntity } from './base-notification.entity';
import { NotificationType } from '../enums/notification-types';

@Schema({ _id: false, timestamps: false })
export class RepostNotificationEntity extends BaseNotificationEntity {
    @Prop({
        type: String,
        enum: NotificationType,
        default: NotificationType.REPOST,
        required: true,
    })
    declare type: NotificationType.REPOST;

    @Prop({ type: String, required: true })
    tweet_id: string;

    @Prop({ type: String, required: true })
    reposted_by: string;
}

export const RepostNotificationSchema = SchemaFactory.createForClass(RepostNotificationEntity);
