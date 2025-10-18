import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { NotificationType } from '../enums/notification-types';

@Schema({ _id: false, timestamps: false })
export class BaseNotificationEntity {
  @Prop({ type: String, enum: NotificationType, required: true })
  type: NotificationType;

  @Prop({ type: Date, default: Date.now })
  created_at: Date;

  // not sure if this is important
  @Prop({ type: Date, default: Date.now })
  updated_at: Date;

  @Prop({
    type: [String],
    required: true,
  })
  trigger_ids: string[];

  @Prop({
    type: [String],
    required: true,
  })
  user_ids: string[];

  @Prop({
    type: String,
    required: true,
  })
  content: string;

  @Prop({
    type: Boolean,
    default: false,
  })
  seen: boolean;

  @Prop({
    type: String,
    required: false,
  })
  chat_message?: string;
}

export const BaseNotificationSchema = SchemaFactory.createForClass(
  BaseNotificationEntity,
);
