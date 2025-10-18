import { BadRequestException } from '@nestjs/common';
import { ERROR_MESSAGES } from '../../constants/swagger-messages';

// Image configuration
export const imageFileFilter = (req: any, file: any, callback: any) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    
    if (!allowedMimeTypes.includes(file.mimetype)) {
        return callback(
            new BadRequestException(ERROR_MESSAGES.INVALID_FILE_TYPE),
            false,
        );
    }
    callback(null, true);
};

// Video configuration
export const videoFileFilter = (req: any, file: any, callback: any) => {
    const allowedMimeTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
    
    if (!allowedMimeTypes.includes(file.mimetype)) {
        return callback(
            new BadRequestException(ERROR_MESSAGES.INVALID_FILE_TYPE),
            false,
        );
    }
    callback(null, true);
};

// File size limits (in bytes)
export const IMAGE_MAX_SIZE = 5 * 1024 * 1024; // 5MB
export const VIDEO_MAX_SIZE = 50 * 1024 * 1024; // 50MB
