import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { BaseNotificationEntity, BaseNotificationSchema } from './base_notification.entity';

@Schema({ collection: 'notifications', timestamps: true })
export class Notification extends Document {
  @Prop({ type: String, required: true, unique: true })
  user: String;

  @Prop({ default: [], required: true, type: [BaseNotificationSchema], maxLength: 50 })
  notifications: BaseNotificationEntity[];
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
