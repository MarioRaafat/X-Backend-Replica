import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { JOB_NAMES, QUEUE_NAMES } from '../constants/queue.constants';
import { ICompressVideoJobDto } from './compress-video.dto';
import { BlobServiceClient } from '@azure/storage-blob';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { promises as fs } from 'fs';
import * as path from 'path';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

@Processor(QUEUE_NAMES.VIDEO)
export class CompressVideoProcessor {
    private readonly logger = new Logger(CompressVideoProcessor.name);

    @Process(JOB_NAMES.VIDEO.COMPRESS)
    async handleCompressVideo(job: Job<ICompressVideoJobDto>) {
        const { video_url, video_name, container_name } = job.data;

        try {
            this.logger.log(`Starting compression for video: ${video_name}`);

            // 1. Download the original video from Azure
            const video_buffer = await this.downloadVideoFromAzure(video_url, container_name);

            // 2. Compress the video
            const compressed_buffer = await this.convertToCompressedMp4(video_buffer);

            // 3. Upload the compressed video with the same name (replace original)
            await this.uploadVideoToAzure(compressed_buffer, video_name, container_name);

            this.logger.log(`Successfully compressed and replaced video: ${video_name}`);
            return { success: true, video_name };
        } catch (error) {
            this.logger.error(`Failed to compress video ${video_name}:`, error);
            throw error;
        }
    }

    private async downloadVideoFromAzure(
        video_url: string,
        container_name: string
    ): Promise<Buffer> {
        const connection_string = process.env.AZURE_STORAGE_CONNECTION_STRING;
        if (!connection_string) {
            throw new Error('AZURE_STORAGE_CONNECTION_STRING is not defined');
        }

        const blob_service_client = BlobServiceClient.fromConnectionString(connection_string);
        const container_client = blob_service_client.getContainerClient(container_name);

        // Extract blob name from URL (last segment of pathname)
        const url = new URL(video_url);
        const path_segments = url.pathname.split('/').filter((s) => s);
        const blob_name = decodeURIComponent(path_segments[path_segments.length - 1]);

        const block_blob_client = container_client.getBlockBlobClient(blob_name);
        const download_response = await block_blob_client.download();

        return this.streamToBuffer(download_response.readableStreamBody!);
    }

    private async streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
        const chunks: Buffer[] = [];
        return new Promise((resolve, reject) => {
            stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
            stream.on('error', reject);
            stream.on('end', () => resolve(Buffer.concat(chunks)));
        });
    }

    private async convertToCompressedMp4(video_buffer: Buffer): Promise<Buffer> {
        const input_path = path.join('/tmp', `input_${Date.now()}.mp4`);
        const output_path = path.join('/tmp', `output_${Date.now()}.mp4`);

        await fs.writeFile(input_path, video_buffer);

        return new Promise((resolve, reject) => {
            ffmpeg(input_path)
                .outputOptions([
                    '-vcodec libx264',
                    '-crf 28',
                    '-preset veryfast',
                    '-acodec aac',
                    '-movflags +frag_keyframe+empty_moov+faststart',
                ])
                .output(output_path)
                .on('end', async () => {
                    try {
                        const result = await fs.readFile(output_path);

                        // Cleanup temp files
                        await fs.unlink(input_path).catch(() => {});
                        await fs.unlink(output_path).catch(() => {});

                        resolve(result);
                    } catch (err) {
                        reject(err instanceof Error ? err : new Error(String(err)));
                    }
                })
                .on('error', async (err) => {
                    this.logger.error('FFmpeg error:', err);

                    // Cleanup even on error
                    await fs.unlink(input_path).catch(() => {});
                    await fs.unlink(output_path).catch(() => {});
                    reject(err instanceof Error ? err : new Error(String(err)));
                })
                .run();
        });
    }

    private async uploadVideoToAzure(
        video_buffer: Buffer,
        video_name: string,
        container_name: string
    ): Promise<void> {
        const connection_string = process.env.AZURE_STORAGE_CONNECTION_STRING;
        if (!connection_string) {
            throw new Error('AZURE_STORAGE_CONNECTION_STRING is not defined');
        }

        const blob_service_client = BlobServiceClient.fromConnectionString(connection_string);
        const container_client = blob_service_client.getContainerClient(container_name);

        const block_blob_client = container_client.getBlockBlobClient(video_name);

        // Upload compressed video (overwrites original)
        await block_blob_client.upload(video_buffer, video_buffer.length, {
            blobHTTPHeaders: {
                blobContentType: 'video/mp4',
            },
        });

        this.logger.log(`Uploaded compressed video: ${video_name}`);
    }
}
