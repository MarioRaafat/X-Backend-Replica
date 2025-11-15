// import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
// import { Document, Types } from 'mongoose';
// import { BaseNotificationEntity, BaseNotificationSchema } from './base-notification.entity';

// @Schema({ collection: 'notifications', timestamps: true })
// export class Notification extends Document {
//     @Prop({ type: String, required: true, unique: true })
//     user: string;

//     @Prop({ default: [], required: true, type: [BaseNotificationSchema], maxLength: 50 })
//     notifications: BaseNotificationEntity[];

//     @Prop({ type: Number, name: 'newest_date', default: Date.now() })
//     newestCount: number;
// }

// export const NotificationSchema = SchemaFactory.createForClass(Notification);
