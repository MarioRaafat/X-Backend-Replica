import { BadRequestException } from '@nestjs/common';
import { image_file_filter, video_file_filter } from './file-upload.config';
import { ERROR_MESSAGES } from '../../constants/swagger-messages';

describe('File Upload Config', () => {
    describe('image_file_filter', () => {
        it('should accept valid image types', () => {
            const valid_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

            valid_types.forEach((mimetype) => {
                const callback = jest.fn();
                const file = { mimetype };
                const req = {};

                image_file_filter(req, file, callback);

                expect(callback).toHaveBeenCalledWith(null, true);
            });
        });

        it('should reject invalid image types', () => {
            const callback = jest.fn();
            const file = { mimetype: 'application/pdf' };
            const req = {};

            image_file_filter(req, file, callback);

            expect(callback).toHaveBeenCalledWith(
                expect.objectContaining({
                    response: expect.objectContaining({
                        message: ERROR_MESSAGES.INVALID_FILE_TYPE,
                    }),
                }),
                false
            );
        });

        it('should reject text files', () => {
            const callback = jest.fn();
            const file = { mimetype: 'text/plain' };
            const req = {};

            image_file_filter(req, file, callback);

            expect(callback).toHaveBeenCalledWith(expect.any(BadRequestException), false);
        });
    });

    describe('video_file_filter', () => {
        it('should accept valid video types', () => {
            const valid_types = [
                'video/mp4',
                'video/quicktime',
                'video/x-msvideo',
                'video/webm',
            ];

            valid_types.forEach((mimetype) => {
                const callback = jest.fn();
                const file = { mimetype };
                const req = {};

                video_file_filter(req, file, callback);

                expect(callback).toHaveBeenCalledWith(null, true);
            });
        });

        it('should reject invalid video types', () => {
            const callback = jest.fn();
            const file = { mimetype: 'application/pdf' };
            const req = {};

            video_file_filter(req, file, callback);

            expect(callback).toHaveBeenCalledWith(
                expect.objectContaining({
                    response: expect.objectContaining({
                        message: ERROR_MESSAGES.INVALID_FILE_TYPE,
                    }),
                }),
                false
            );
        });

        it('should reject audio files', () => {
            const callback = jest.fn();
            const file = { mimetype: 'audio/mpeg' };
            const req = {};

            video_file_filter(req, file, callback);

            expect(callback).toHaveBeenCalledWith(expect.any(BadRequestException), false);
        });

        it('should reject image files in video filter', () => {
            const callback = jest.fn();
            const file = { mimetype: 'image/jpeg' };
            const req = {};

            video_file_filter(req, file, callback);

            expect(callback).toHaveBeenCalledWith(expect.any(BadRequestException), false);
        });
    });
});
