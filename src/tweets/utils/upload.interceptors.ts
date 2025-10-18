import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
    imageFileFilter,
    videoFileFilter,
    IMAGE_MAX_SIZE,
    VIDEO_MAX_SIZE,
} from './file-upload.config';

/**
 * Interceptor for image file uploads
 * Validates file type and size without saving to disk
 * Files are kept in memory only during request processing
 */
export const ImageUploadInterceptor = FileInterceptor('file', {
    storage: memoryStorage(), // ← Store in memory,temporarily
    fileFilter: imageFileFilter,
    limits: { fileSize: IMAGE_MAX_SIZE },
});

/**
 * Interceptor for video file uploads
 * Validates file type and size without saving to disk
 * Files are kept in memory only during request processing
 */
export const VideoUploadInterceptor = FileInterceptor('file', {
    storage: memoryStorage(), // ← Store in memory, temporarily
    fileFilter: videoFileFilter,
    limits: { fileSize: VIDEO_MAX_SIZE },
});
