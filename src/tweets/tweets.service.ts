import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UploadMediaResponseDTO } from './dto/upload-media.dto';
import { 
    Tweet, 
    TweetLike, 
    TweetRepost, 
    TweetQuote, 
    TweetReply 
} from './entities';

@Injectable()
export class TweetsService {
    constructor(
        @InjectRepository(Tweet)
        private readonly tweet_repository: Repository<Tweet>,
        @InjectRepository(TweetLike)
        private readonly tweet_like_repository: Repository<TweetLike>,
        @InjectRepository(TweetRepost)
        private readonly tweet_repost_repository: Repository<TweetRepost>,
        @InjectRepository(TweetQuote)
        private readonly tweet_quote_repository: Repository<TweetQuote>,
        @InjectRepository(TweetReply)
        private readonly tweet_reply_repository: Repository<TweetReply>,
    ) {}
    /**
     * Handles image upload processing
     * @param file - The uploaded image file (in memory, not saved to disk)
     * @param userId - The authenticated user's ID
     * @returns Upload response with file metadata
     */
    async uploadImage(
        file: Express.Multer.File,
        userId: string,
    ): Promise<UploadMediaResponseDTO> {
        // TODO: Implement image upload logic
        // - Upload to cloud storage (S3, Cloudinary, etc.)
        // - Save file metadata to database
        // - Process/compress image if needed
        // - Generate thumbnail
        // - Return file URL and metadata
        
        // File is in memory as file.buffer
        // NOT saved to disk - discarded after request
        return {
            url: `https://your-cdn.com/placeholder-url`, // Placeholder URL
            filename: file.originalname,
            size: file.size,
            mime_type: file.mimetype,
        };
    }

    /**
     * Handles video upload processing
     * @param file - The uploaded video file (in memory, not saved to disk)
     * @param userId - The authenticated user's ID
     * @returns Upload response with file metadata
     */
    async uploadVideo(
        file: Express.Multer.File,
        userId: string,
    ): Promise<UploadMediaResponseDTO> {
        // TODO: Implement video upload logic
        // - Upload to cloud storage (S3, Cloudinary, etc.)
        // - Save file metadata to database
        // - Transcode video if needed
        // - Generate thumbnail/preview
        // - Return file URL and metadata
        
        // File is in memory as file.buffer
        // NOT saved to disk - discarded after request
        return {
            url: `https://your-cdn.com/placeholder-url`, // Placeholder URL
            filename: file.originalname,
            size: file.size,
            mime_type: file.mimetype,
        };
    }
}
