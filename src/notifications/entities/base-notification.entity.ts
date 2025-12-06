import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { NotificationType } from '../enums/notification-types';

@Schema({ _id: false, timestamps: false })
export abstract class BaseNotificationEntity {
    @Prop({ type: String, enum: NotificationType, required: true })
    type: NotificationType;

    @Prop({ type: Date, default: Date.now })
    created_at: Date;
}
