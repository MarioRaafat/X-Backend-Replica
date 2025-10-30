import { ObjectLiteral, Repository } from 'typeorm';

import * as bcrypt from 'bcrypt';

/**
 * Seed Helper Service
 * Provides common utilities for seeding operations
 */
export class SeedHelper {
    private static readonly batch_size = 800;

    /**
     * Insert entities in batches to optimize memory usage
     */
    static async insertBatch<T extends ObjectLiteral>(
        repository: Repository<T>,
        entities: T[],
        batch_size: number = this.batch_size
    ): Promise<T[]> {
        const inserted: T[] = [];

        for (let i = 0; i < entities.length; i += batch_size) {
            const batch = entities.slice(i, i + batch_size);
            const saved = await repository.save(batch);
            inserted.push(...(Array.isArray(saved) ? saved : [saved]));

            console.log(
                `   💾 Batch ${Math.floor(i / batch_size) + 1}/${Math.ceil(entities.length / batch_size)} - ${batch.length} records`
            );
        }

        return inserted;
    }
    static removeDuplicates<T>(items: T[], key_selector: (item: T) => string): T[] {
        const seen = new Set<string>();
        const unique: T[] = [];

        for (const item of items) {
            const key = key_selector(item);
            if (!key) continue; // skip invalid rows
            const normalized_key = key.trim().toLowerCase();

            if (!seen.has(normalized_key)) {
                seen.add(normalized_key);
                unique.push(item);
            }
        }

        return unique;
    }
    /**
     * Generate hashed password
     */
    static async hashPassword(): Promise<string> {
        const password = process.env.DEFAULT_PASSWORD;

        if (!password) {
            throw new Error('❌ DEFAULT_PASSWORD is not defined in environment variables.');
        }
        return bcrypt.hash(password, 10);
    }

    /**
     * Generate email from username
     */
    static generateEmail(username: string, topic?: string): string {
        const sanitized = username.toLowerCase();
        return `${sanitized}@KingMario.com`;
    }

    /**
     * Generate random birth date
     */
    static generateBirthDate(): Date {
        const max_age = 65;
        const min_age = 18;
        const today = new Date();
        const year =
            today.getFullYear() - min_age - Math.floor(Math.random() * (max_age - min_age));
        const month = Math.floor(Math.random() * 12);
        const day = Math.floor(Math.random() * 28) + 1;

        return new Date(year, month, day);
    }
    static parseInt(value: any, default_value: number = 0): number {
        const parsed = parseInt(value?.toString() || '', 10);
        return isNaN(parsed) ? default_value : parsed;
    }

    /**
     * Parse date safely
     */
    static parseDate(value: any): Date | null {
        if (!value) return null;

        let date: Date;

        if (typeof value === 'number') {
            // Handle Excel numeric date (days since 1899-12-30)
            const excel_epoch = new Date(Date.UTC(1899, 11, 30));
            date = new Date(excel_epoch.getTime() + value * 24 * 60 * 60 * 1000);
        } else {
            // Normalize strings like "May 6, 2017 at 07:04 PM"
            const cleaned = String(value)
                .replace(/\bat\b/i, '')
                .trim();
            date = new Date(cleaned);
        }

        // Return null if invalid date
        if (isNaN(date.getTime())) return null;

        return date;
    }
    static parseMedia(media: any): { images: string[]; videos: string[] } {
        const result = { images: [] as string[], videos: [] as string[] };

        if (!media) return result;

        try {
            // If it's a stringified JSON, parse it
            if (typeof media === 'string') {
                media = media.trim();
                if (media.startsWith('[') || media.startsWith('{')) {
                    media = JSON.parse(media);
                }
            }

            // If media is now an array of objects like [{url: "..."}]
            if (Array.isArray(media)) {
                for (const item of media) {
                    if (typeof item === 'string') {
                        if (this.isVideoUrl(item)) result.videos.push(item);
                        else if (this.isImageUrl(item)) result.images.push(item);
                    } else if (item && typeof item === 'object') {
                        const url = item.url || item.media_url || item.src || '';
                        if (this.isVideoUrl(url)) result.videos.push(url);
                        else if (this.isImageUrl(url)) result.images.push(url);
                    }
                }
                return result;
            }

            // If it's an object with {images, videos}
            if (typeof media === 'object' && !Array.isArray(media)) {
                result.images = Array.isArray(media.images) ? media.images : [];
                result.videos = Array.isArray(media.videos) ? media.videos : [];
                return result;
            }

            // Comma-separated URLs
            if (typeof media === 'string' && media.includes(',')) {
                const urls = media.split(',').map((u) => u.trim());
                for (const url of urls) {
                    if (this.isVideoUrl(url)) result.videos.push(url);
                    else if (this.isImageUrl(url)) result.images.push(url);
                }
                return result;
            }

            // Single URL
            if (typeof media === 'string' && media.length > 0) {
                if (this.isVideoUrl(media)) result.videos.push(media);
                else if (this.isImageUrl(media)) result.images.push(media);
                return result;
            }
        } catch (error) {
            console.warn(`⚠️  Failed to parse media: ${error.message}`);
        }

        return result;
    }

    private static isImageUrl(url: string): boolean {
        const image_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
        const lower_url = url.toLowerCase();
        return image_extensions.some((ext) => lower_url.includes(ext));
    }

    private static isVideoUrl(url: string): boolean {
        const video_extensions = ['.mp4', '.mov', '.avi', '.webm', '.mkv'];
        const lower_url = url.toLowerCase();
        return (
            video_extensions.some((ext) => lower_url.includes(ext)) ||
            lower_url.includes('youtube.com') ||
            lower_url.includes('youtu.be') ||
            lower_url.includes('vimeo.com')
        );
    }
}
