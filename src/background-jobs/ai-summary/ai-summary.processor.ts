import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { JOB_NAMES, QUEUE_NAMES } from '../constants/queue.constants';
import type { GenerateTweetSummaryDto } from './ai-summary.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TweetSummary } from 'src/tweets/entities/tweet-summary.entity';
import Groq from 'groq-sdk';
import { summarize_prompt } from 'src/tweets/constants';

@Processor(QUEUE_NAMES.AI_SUMMARY)
export class AiSummaryProcessor {
    private readonly logger = new Logger(AiSummaryProcessor.name);
    private readonly groq: Groq;

    constructor(
        @InjectRepository(TweetSummary)
        private readonly tweet_summary_repository: Repository<TweetSummary>
    ) {
        const apiKey = process.env.GROQ_API_KEY ?? '';
        this.groq = new Groq({ apiKey });
    }

    @Process(JOB_NAMES.AI_SUMMARY.GENERATE_TWEET_SUMMARY)
    async handleGenerateSummary(job: Job<GenerateTweetSummaryDto>) {
        const { tweet_id, content } = job.data;

        try {
            this.logger.log(`Processing AI summary generation for tweet: ${tweet_id}`);

            // Check if summary already exists
            const existingSummary = await this.tweet_summary_repository.findOne({
                where: { tweet_id },
            });

            if (existingSummary) {
                this.logger.log(`Summary already exists for tweet: ${tweet_id}`);
                return { success: true, summary: existingSummary.summary };
            }

            // Check if Groq is enabled
            if (!process.env.ENABLE_GROQ || !process.env.MODEL_NAME) {
                this.logger.warn('Groq is disabled, skipping summary generation');
                return { success: false, reason: 'Groq disabled' };
            }

            const prompt = summarize_prompt(content);

            // Generate summary using Groq
            const response = await this.groq.chat.completions.create({
                model: process.env.MODEL_NAME!,
                messages: [
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
                temperature: 0.5,
                max_tokens: 100,
            });

            const summary = response.choices[0]?.message?.content || '';

            // Save summary to database
            const tweetSummary = this.tweet_summary_repository.create({
                tweet_id,
                summary,
            });

            await this.tweet_summary_repository.save(tweetSummary);

            this.logger.log(`Successfully generated summary for tweet: ${tweet_id}`);
            return { success: true, summary };
        } catch (error) {
            this.logger.error(`Failed to generate summary for tweet ${tweet_id}:`, error);
            throw error;
        }
    }
}
