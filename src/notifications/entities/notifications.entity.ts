import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { BaseNotificationEntity } from './base-notification.entity';

@Schema({ collection: 'notifications', timestamps: true })
export class Notification extends Document {
    @Prop({ type: String, required: true, unique: true })
    user: string;

    @Prop({ default: [], required: true, type: Array, maxLength: 50 })
    notifications: BaseNotificationEntity[];

    @Prop({ type: Number, name: 'newest_date', default: Date.now() })
    newest_count: number;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
