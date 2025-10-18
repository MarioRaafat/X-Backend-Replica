import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { NotificationTypes } from "../enums/notidication_types";

@Schema({ _id: false })
export class BaseNotificationEntity {
    @Prop({ type: String, enum: NotificationTypes, required: true })
    type: NotificationTypes;

    @Prop({ type: Date, default: Date.now })
    createdAt: Date;

    // not sure if this is important
    @Prop({ type: Date, default: Date.now })
    updatedAt: Date;
}

export const BaseNotificationSchema = SchemaFactory.createForClass(BaseNotificationEntity);