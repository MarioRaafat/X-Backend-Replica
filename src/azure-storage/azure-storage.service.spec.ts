import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AzureStorageService } from './azure-storage.service';
import { BlobServiceClient, BlockBlobClient, ContainerClient } from '@azure/storage-blob';
import { ERROR_MESSAGES } from 'src/constants/swagger-messages';

jest.mock('@azure/storage-blob');

describe('AzureStorageService', () => {
    let service: AzureStorageService;
    let config_service: ConfigService;
    let mock_blob_service_client: Partial<BlobServiceClient>;
    let mock_container_client: Partial<ContainerClient>;
    let mock_block_blob_client: Partial<BlockBlobClient>;

    beforeEach(async () => {
        mock_block_blob_client = {
            upload: jest.fn(),
            delete: jest.fn(),
            exists: jest.fn(),
            url: 'https://storage.azure.com/container/file.jpg',
        };

        mock_container_client = {
            getBlockBlobClient: jest.fn().mockReturnValue(mock_block_blob_client),
        };

        mock_blob_service_client = {
            getContainerClient: jest.fn().mockReturnValue(mock_container_client),
        };

        (BlobServiceClient.fromConnectionString as jest.Mock) = jest
            .fn()
            .mockReturnValue(mock_blob_service_client);

        const mock_config_service = {
            get: jest.fn((key: string) => {
                if (key === 'AZURE_STORAGE_CONNECTION_STRING') {
                    return 'DefaultEndpointsProtocol=https;AccountName=test;AccountKey=test==;';
                }
                if (key === 'AZURE_STORAGE_PROFILE_IMAGE_CONTAINER') {
                    return 'profile-images';
                }
                return null;
            }),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AzureStorageService,
                {
                    provide: ConfigService,
                    useValue: mock_config_service,
                },
            ],
        }).compile();

        service = module.get<AzureStorageService>(AzureStorageService);
        config_service = module.get(ConfigService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('onModuleInit', () => {
        it('should initialize blob service client with connection string', () => {
            const config_get_spy = jest.spyOn(config_service, 'get');
            const from_connection_string_spy = jest.spyOn(
                BlobServiceClient,
                'fromConnectionString'
            );

            service.onModuleInit();

            expect(config_get_spy).toHaveBeenCalledWith('AZURE_STORAGE_CONNECTION_STRING');
            expect(from_connection_string_spy).toHaveBeenCalledWith(
                'DefaultEndpointsProtocol=https;AccountName=test;AccountKey=test==;'
            );
        });

        it('should throw error when connection string is not defined', () => {
            const config_get_spy = jest.spyOn(config_service, 'get').mockReturnValueOnce(undefined);

            expect(() => service.onModuleInit()).toThrow(
                'AZURE_STORAGE_CONNECTION_STRING is not defined'
            );

            expect(config_get_spy).toHaveBeenCalledWith('AZURE_STORAGE_CONNECTION_STRING');
        });

        it('should set default container name when not provided in config', () => {
            const config_get_spy = jest
                .spyOn(config_service, 'get')
                .mockImplementation((key: string) => {
                    if (key === 'AZURE_STORAGE_CONNECTION_STRING') {
                        return 'DefaultEndpointsProtocol=https;AccountName=test;AccountKey=test==;';
                    }
                    return undefined;
                });

            service.onModuleInit();

            expect(config_get_spy).toHaveBeenCalledWith('AZURE_STORAGE_PROFILE_IMAGE_CONTAINER');
        });
    });

    describe('getContainerClient', () => {
        beforeEach(() => {
            service.onModuleInit();
        });

        it('should return container client with provided container name', () => {
            const container_name = 'custom-container';

            const get_container_client_spy = jest.spyOn(
                mock_blob_service_client as any,
                'getContainerClient'
            );

            const result = service.getContainerClient(container_name);

            expect(get_container_client_spy).toHaveBeenCalledWith(container_name);
            expect(result).toBe(mock_container_client);
        });

        it('should return container client with default container name when not provided', () => {
            const get_container_client_spy = jest.spyOn(
                mock_blob_service_client as any,
                'getContainerClient'
            );

            const result = service.getContainerClient();

            expect(get_container_client_spy).toHaveBeenCalledWith('profile-images');
            expect(result).toBe(mock_container_client);
        });
    });

    describe('uploadFile', () => {
        beforeEach(() => {
            service.onModuleInit();
        });

        it('should upload file and return url', async () => {
            const file_buffer = Buffer.from('fake-file-data');
            const file_name = 'test-file.jpg';
            const container_name = 'profile-images';

            const get_container_client_spy = jest.spyOn(
                mock_blob_service_client as any,
                'getContainerClient'
            );
            const get_block_blob_client_spy = jest.spyOn(
                mock_container_client as any,
                'getBlockBlobClient'
            );
            const upload_spy = jest
                .spyOn(mock_block_blob_client as any, 'upload')
                .mockResolvedValueOnce({} as any);

            const result = await service.uploadFile(file_buffer, file_name, container_name);

            expect(get_container_client_spy).toHaveBeenCalledWith(container_name);
            expect(get_block_blob_client_spy).toHaveBeenCalledWith(file_name);
            expect(upload_spy).toHaveBeenCalledWith(file_buffer, file_buffer.length);
            expect(result).toBe('https://storage.azure.com/container/file.jpg');
        });

        it('should upload file with default container name when not provided', async () => {
            const file_buffer = Buffer.from('fake-file-data');
            const file_name = 'test-file.jpg';

            const get_container_client_spy = jest.spyOn(
                mock_blob_service_client as any,
                'getContainerClient'
            );
            const get_block_blob_client_spy = jest.spyOn(
                mock_container_client as any,
                'getBlockBlobClient'
            );
            const upload_spy = jest
                .spyOn(mock_block_blob_client as any, 'upload')
                .mockResolvedValueOnce({} as any);

            const result = await service.uploadFile(file_buffer, file_name);

            expect(get_container_client_spy).toHaveBeenCalledWith('profile-images');
            expect(get_block_blob_client_spy).toHaveBeenCalledWith(file_name);
            expect(upload_spy).toHaveBeenCalledWith(file_buffer, file_buffer.length);
            expect(result).toBe('https://storage.azure.com/container/file.jpg');
        });
    });

    describe('deleteFile', () => {
        beforeEach(() => {
            service.onModuleInit();
        });

        it('should delete file from specified container when file exists', async () => {
            const file_name = 'test-file.jpg';
            const container_name = 'profile-images';

            const get_container_client_spy = jest.spyOn(
                mock_blob_service_client as any,
                'getContainerClient'
            );
            const get_block_blob_client_spy = jest.spyOn(
                mock_container_client as any,
                'getBlockBlobClient'
            );
            const exists_spy = jest
                .spyOn(mock_block_blob_client as any, 'exists')
                .mockResolvedValueOnce(true);
            const delete_spy = jest
                .spyOn(mock_block_blob_client as any, 'delete')
                .mockResolvedValueOnce({} as any);

            await service.deleteFile(file_name, container_name);

            expect(get_container_client_spy).toHaveBeenCalledWith(container_name);
            expect(get_block_blob_client_spy).toHaveBeenCalledWith(file_name);
            expect(exists_spy).toHaveBeenCalledTimes(1);
            expect(delete_spy).toHaveBeenCalledTimes(1);
        });

        it('should delete file from default container when not provided', async () => {
            const file_name = 'test-file.jpg';

            const get_container_client_spy = jest.spyOn(
                mock_blob_service_client as any,
                'getContainerClient'
            );
            const get_block_blob_client_spy = jest.spyOn(
                mock_container_client as any,
                'getBlockBlobClient'
            );
            const exists_spy = jest
                .spyOn(mock_block_blob_client as any, 'exists')
                .mockResolvedValueOnce(true);
            const delete_spy = jest
                .spyOn(mock_block_blob_client as any, 'delete')
                .mockResolvedValueOnce({} as any);

            await service.deleteFile(file_name);

            expect(get_container_client_spy).toHaveBeenCalledWith('profile-images');
            expect(get_block_blob_client_spy).toHaveBeenCalledWith(file_name);
            expect(exists_spy).toHaveBeenCalledTimes(1);
            expect(delete_spy).toHaveBeenCalledTimes(1);
        });

        it('should throw NotFoundException when file does not exist', async () => {
            const file_name = 'nonexistent-file.jpg';
            const container_name = 'profile-images';

            const exists_spy = jest
                .spyOn(mock_block_blob_client as any, 'exists')
                .mockResolvedValueOnce(false);

            await expect(service.deleteFile(file_name, container_name)).rejects.toThrow(
                ERROR_MESSAGES.FILE_NOT_FOUND
            );

            expect(exists_spy).toHaveBeenCalledTimes(1);
        });
    });

    describe('generateFileName', () => {
        it('should generate file name with user id, timestamp, and original name', () => {
            const user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const original_name = 'avatar.jpg';

            const date_now_spy = jest.spyOn(Date, 'now').mockReturnValue(1234567890);

            const result = service.generateFileName(user_id, original_name);

            expect(date_now_spy).toHaveBeenCalledTimes(1);
            expect(result).toBe(`${user_id}-1234567890-${original_name}`);
        });

        it('should generate unique names for same user and file', () => {
            const user_id = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d';
            const original_name = 'avatar.jpg';

            const date_now_spy = jest
                .spyOn(Date, 'now')
                .mockReturnValueOnce(1234567890)
                .mockReturnValueOnce(1234567900);

            const result1 = service.generateFileName(user_id, original_name);
            const result2 = service.generateFileName(user_id, original_name);

            expect(date_now_spy).toHaveBeenCalledTimes(2);
            expect(result1).toBe(`${user_id}-1234567890-${original_name}`);
            expect(result2).toBe(`${user_id}-1234567900-${original_name}`);
            expect(result1).not.toBe(result2);
        });
    });

    describe('extractFileName', () => {
        it('should extract file name from url', () => {
            const file_url = 'https://storage.azure.com/container/user123-1234567890-avatar.jpg';

            const result = service.extractFileName(file_url);

            expect(result).toBe('user123-1234567890-avatar.jpg');
        });

        it('should throw BadRequestException when url is invalid', () => {
            const file_url = 'https://storage.azure.com/container/';

            expect(() => service.extractFileName(file_url)).toThrow(
                ERROR_MESSAGES.INVALID_FILE_URL
            );
        });

        it('should throw BadRequestException when url has no file name', () => {
            const file_url = '';

            expect(() => service.extractFileName(file_url)).toThrow(
                ERROR_MESSAGES.INVALID_FILE_URL
            );
        });
    });

    describe('extractUserIdFromFileName', () => {
        it('should extract user id from file name', () => {
            const file_name = '0c059899-f706-4c8f-97d7-ba2e9fc22d6d-1234567890-avatar.jpg';

            const result = service.extractUserIdFromFileName(file_name);

            expect(result).toBe('0c059899-f706-4c8f-97d7-ba2e9fc22d6d');
        });

        it('should handle file name with multiple dashes', () => {
            const file_name = '1a2b3c4d-5e6f-7g8h-9i0j-k1l2m3n4o5p6-9876543210-profile-pic.jpg';

            const result = service.extractUserIdFromFileName(file_name);

            expect(result).toBe('1a2b3c4d-5e6f-7g8h-9i0j-k1l2m3n4o5p6');
        });
    });
});
