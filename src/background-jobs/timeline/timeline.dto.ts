export interface IInitTimelineQueueJobDTO {
    user_id: string;
}

export interface IRefillTimelineQueueJobDTO {
    user_id: string;
    refill_count: number;
}

export interface ICleanupOldTweetsJobDTO {
    user_id?: string; // If not provided, cleanup for all users
}
