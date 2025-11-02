import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
    image_file_filter,
    IMAGE_MAX_SIZE,
    video_file_filter,
    VIDEO_MAX_SIZE,
} from './file-upload.config';

/**
 * Interceptor for image file uploads
 * Validates file type and size without saving to disk
 * Files are kept in memory only during request processing
 */
export const ImageUploadInterceptor = FileInterceptor('file', {
    storage: memoryStorage(), // ← Store in memory,temporarily
    fileFilter: image_file_filter,
    limits: { fileSize: IMAGE_MAX_SIZE },
});

/**
 * Interceptor for video file uploads
 * Validates file type and size without saving to disk
 * Files are kept in memory only during request processing
 */
export const VideoUploadInterceptor = FileInterceptor('file', {
    storage: memoryStorage(), // ← Store in memory, temporarily
    fileFilter: video_file_filter,
    limits: { fileSize: VIDEO_MAX_SIZE },
});
