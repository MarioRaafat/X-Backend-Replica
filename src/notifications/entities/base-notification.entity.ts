import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { NotificationType } from '../enums/notification-types';
import { Types } from 'mongoose';

@Schema({ timestamps: false })
export abstract class BaseNotificationEntity {
    @Prop({ type: Types.ObjectId, auto: true })
    _id?: Types.ObjectId;

    @Prop({ type: String, enum: NotificationType, required: true })
    type: NotificationType;

    @Prop({ type: Date, default: Date.now })
    created_at: Date;
}
