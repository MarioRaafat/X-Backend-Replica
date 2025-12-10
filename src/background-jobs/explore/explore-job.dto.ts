import { IsNumber, IsOptional, Min } from 'class-validator';
import { EXPLORE_CONFIG } from '../constants/queue.constants';

export class ExploreScoreJobDto {
    @IsOptional()
    @IsNumber()
    @Min(0.1)
    since_hours?: number = EXPLORE_CONFIG.DEFAULT_SINCE_HOURS;

    @IsOptional()
    @IsNumber()
    @Min(1)
    max_age_hours?: number = EXPLORE_CONFIG.DEFAULT_MAX_AGE_HOURS;

    @IsOptional()
    @IsNumber()
    @Min(10)
    batch_size?: number = EXPLORE_CONFIG.DEFAULT_BATCH_SIZE;

    // Force recalculation for all tweets within max_age, regardless of recent engagement
    @IsOptional()
    force_all?: boolean = false;
}

export class ExploreScoreResultDto {
    tweets_processed: number;
    tweets_updated: number;
    categories_updated: number;
    duration_ms: number;
    errors: string[];
}
