import { Test, TestingModule } from '@nestjs/testing';
import type { Job } from 'bull';
import { ICompressVideoJobDto } from './compress-video.dto';

// Mock modules before importing the processor
jest.mock('@azure/storage-blob', () => ({
    BlobServiceClient: {
        fromConnectionString: jest.fn(),
    },
}));

jest.mock('fluent-ffmpeg', () => {
    const mock_ffmpeg: any = jest.fn();
    mock_ffmpeg.setFfmpegPath = jest.fn();
    return mock_ffmpeg;
});

jest.mock('@ffmpeg-installer/ffmpeg', () => ({
    path: '/mock/path/to/ffmpeg',
}));

jest.mock('fs', () => ({
    promises: {
        writeFile: jest.fn(),
        readFile: jest.fn(),
        unlink: jest.fn(),
    },
}));

import { CompressVideoProcessor } from './compress-video.processor';
import { BlobServiceClient } from '@azure/storage-blob';

describe('CompressVideoProcessor', () => {
    let processor: CompressVideoProcessor;
    let mock_job: jest.Mocked<Job<ICompressVideoJobDto>>;

    const mock_job_data: ICompressVideoJobDto = {
        video_url: 'https://example.blob.core.windows.net/post-videos/test-video.mp4',
        video_name: 'test-video.mp4',
        container_name: 'post-videos',
    };

    beforeEach(async () => {
        process.env.AZURE_STORAGE_CONNECTION_STRING = 'test-connection-string';

        const module: TestingModule = await Test.createTestingModule({
            providers: [CompressVideoProcessor],
        }).compile();

        processor = module.get<CompressVideoProcessor>(CompressVideoProcessor);

        mock_job = {
            data: mock_job_data,
        } as jest.Mocked<Job<ICompressVideoJobDto>>;
    });

    afterEach(() => {
        jest.clearAllMocks();
        delete process.env.AZURE_STORAGE_CONNECTION_STRING;
    });

    it('should be defined', () => {
        expect(processor).toBeDefined();
    });

    describe('handleCompressVideo', () => {
        it('should successfully compress and upload video', async () => {
            const mock_buffer = Buffer.from('test-video-data');
            const mock_compressed_buffer = Buffer.from('compressed-video-data');

            jest.spyOn(processor as any, 'downloadVideoFromAzure').mockResolvedValue(mock_buffer);
            jest.spyOn(processor as any, 'convertToCompressedMp4').mockResolvedValue(
                mock_compressed_buffer
            );
            jest.spyOn(processor as any, 'uploadVideoToAzure').mockResolvedValue(undefined);

            const result = await processor.handleCompressVideo(mock_job);

            expect(result).toEqual({ success: true, video_name: mock_job_data.video_name });
            expect(processor['downloadVideoFromAzure']).toHaveBeenCalledWith(
                mock_job_data.video_url,
                mock_job_data.container_name
            );
            expect(processor['convertToCompressedMp4']).toHaveBeenCalledWith(mock_buffer);
            expect(processor['uploadVideoToAzure']).toHaveBeenCalledWith(
                mock_compressed_buffer,
                mock_job_data.video_name,
                mock_job_data.container_name
            );
        });

        it('should throw error when download fails', async () => {
            const error = new Error('Download failed');
            jest.spyOn(processor as any, 'downloadVideoFromAzure').mockRejectedValue(error);

            await expect(processor.handleCompressVideo(mock_job)).rejects.toThrow(
                'Download failed'
            );
        });

        it('should throw error when compression fails', async () => {
            const mock_buffer = Buffer.from('test-video-data');
            const error = new Error('Compression failed');

            jest.spyOn(processor as any, 'downloadVideoFromAzure').mockResolvedValue(mock_buffer);
            jest.spyOn(processor as any, 'convertToCompressedMp4').mockRejectedValue(error);

            await expect(processor.handleCompressVideo(mock_job)).rejects.toThrow(
                'Compression failed'
            );
        });

        it('should throw error when upload fails', async () => {
            const mock_buffer = Buffer.from('test-video-data');
            const mock_compressed_buffer = Buffer.from('compressed-video-data');
            const error = new Error('Upload failed');

            jest.spyOn(processor as any, 'downloadVideoFromAzure').mockResolvedValue(mock_buffer);
            jest.spyOn(processor as any, 'convertToCompressedMp4').mockResolvedValue(
                mock_compressed_buffer
            );
            jest.spyOn(processor as any, 'uploadVideoToAzure').mockRejectedValue(error);

            await expect(processor.handleCompressVideo(mock_job)).rejects.toThrow('Upload failed');
        });

        it('should log success message', async () => {
            const logger_spy = jest.spyOn(processor['logger'], 'log');
            const mock_buffer = Buffer.from('test-video-data');

            jest.spyOn(processor as any, 'downloadVideoFromAzure').mockResolvedValue(mock_buffer);
            jest.spyOn(processor as any, 'convertToCompressedMp4').mockResolvedValue(mock_buffer);
            jest.spyOn(processor as any, 'uploadVideoToAzure').mockResolvedValue(undefined);

            await processor.handleCompressVideo(mock_job);

            expect(logger_spy).toHaveBeenCalledWith(
                `Starting compression for video: ${mock_job_data.video_name}`
            );
            expect(logger_spy).toHaveBeenCalledWith(
                `Successfully compressed and replaced video: ${mock_job_data.video_name}`
            );
        });

        it('should log error message on failure', async () => {
            const logger_spy = jest.spyOn(processor['logger'], 'error');
            const error = new Error('Test error');
            jest.spyOn(processor as any, 'downloadVideoFromAzure').mockRejectedValue(error);

            await expect(processor.handleCompressVideo(mock_job)).rejects.toThrow();

            expect(logger_spy).toHaveBeenCalledWith(
                `Failed to compress video ${mock_job_data.video_name}:`,
                error
            );
        });
    });

    describe('downloadVideoFromAzure', () => {
        it('should throw error when connection string is not defined', async () => {
            delete process.env.AZURE_STORAGE_CONNECTION_STRING;

            await expect(
                processor['downloadVideoFromAzure'](
                    mock_job_data.video_url,
                    mock_job_data.container_name
                )
            ).rejects.toThrow('AZURE_STORAGE_CONNECTION_STRING is not defined');
        });

        it('should correctly extract blob name from URL', async () => {
            const mock_stream = {
                on: jest.fn((event, handler) => {
                    if (event === 'data') handler(Buffer.from('test'));
                    if (event === 'end') handler();
                    return mock_stream;
                }),
            };

            const mock_download_response = {
                readableStreamBody: mock_stream,
            };

            const mock_block_blob_client = {
                download: jest.fn().mockResolvedValue(mock_download_response),
            };

            const mock_container_client = {
                getBlockBlobClient: jest.fn().mockReturnValue(mock_block_blob_client),
            };

            const mock_blob_service_client = {
                getContainerClient: jest.fn().mockReturnValue(mock_container_client),
            };

            (BlobServiceClient.fromConnectionString as jest.Mock).mockReturnValue(
                mock_blob_service_client
            );

            await processor['downloadVideoFromAzure'](
                mock_job_data.video_url,
                mock_job_data.container_name
            );

            expect(mock_container_client.getBlockBlobClient).toHaveBeenCalledWith('test-video.mp4');
        });
    });

    describe('streamToBuffer', () => {
        it('should convert stream to buffer', async () => {
            const test_data = [Buffer.from('chunk1'), Buffer.from('chunk2')];
            const mock_stream = {
                on: jest.fn((event, handler) => {
                    if (event === 'data') {
                        test_data.forEach((chunk) => handler(chunk));
                    }
                    if (event === 'end') handler();
                    return mock_stream;
                }),
            } as any;

            const result = await processor['streamToBuffer'](mock_stream);

            expect(result).toEqual(Buffer.concat(test_data));
        });

        it('should reject on stream error', async () => {
            const error = new Error('Stream error');
            const mock_stream = {
                on: jest.fn((event, handler) => {
                    if (event === 'error') handler(error);
                    return mock_stream;
                }),
            } as any;

            await expect(processor['streamToBuffer'](mock_stream)).rejects.toThrow('Stream error');
        });
    });

    describe('uploadVideoToAzure', () => {
        it('should throw error when connection string is not defined', async () => {
            delete process.env.AZURE_STORAGE_CONNECTION_STRING;

            await expect(
                processor['uploadVideoToAzure'](Buffer.from('test'), 'test.mp4', 'post-videos')
            ).rejects.toThrow('AZURE_STORAGE_CONNECTION_STRING is not defined');
        });

        it('should successfully upload video', async () => {
            const mock_buffer = Buffer.from('compressed-video');
            const mock_upload = jest.fn().mockResolvedValue({});

            const mock_block_blob_client = {
                upload: mock_upload,
            };

            const mock_container_client = {
                getBlockBlobClient: jest.fn().mockReturnValue(mock_block_blob_client),
            };

            const mock_blob_service_client = {
                getContainerClient: jest.fn().mockReturnValue(mock_container_client),
            };

            (BlobServiceClient.fromConnectionString as jest.Mock).mockReturnValue(
                mock_blob_service_client
            );

            await processor['uploadVideoToAzure'](mock_buffer, 'test.mp4', 'post-videos');

            expect(mock_upload).toHaveBeenCalledWith(mock_buffer, mock_buffer.length, {
                blobHTTPHeaders: {
                    blobContentType: 'video/mp4',
                },
            });
        });

        it('should log success message after upload', async () => {
            const logger_spy = jest.spyOn(processor['logger'], 'log');
            const mock_buffer = Buffer.from('compressed-video');

            const mock_block_blob_client = {
                upload: jest.fn().mockResolvedValue({}),
            };

            const mock_container_client = {
                getBlockBlobClient: jest.fn().mockReturnValue(mock_block_blob_client),
            };

            const mock_blob_service_client = {
                getContainerClient: jest.fn().mockReturnValue(mock_container_client),
            };

            (BlobServiceClient.fromConnectionString as jest.Mock).mockReturnValue(
                mock_blob_service_client
            );

            await processor['uploadVideoToAzure'](mock_buffer, 'test.mp4', 'post-videos');

            expect(logger_spy).toHaveBeenCalledWith('Uploaded compressed video: test.mp4');
        });
    });
});
