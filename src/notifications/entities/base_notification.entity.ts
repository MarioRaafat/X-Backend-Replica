import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { NotificationType } from '../enums/notification-types';

@Schema({ _id: false })
export class BaseNotificationEntity {
    @Prop({ type: String, enum: NotificationType, required: true })
    type: NotificationType;

    @Prop({ type: Date, default: Date.now })
    created_at: Date;

    // not sure if this is important
    @Prop({ type: Date, default: Date.now })
    updated_at: Date;
}

export const BaseNotificationSchema = SchemaFactory.createForClass(BaseNotificationEntity);
