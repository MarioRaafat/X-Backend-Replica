import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import { ERROR_MESSAGES } from 'src/constants/swagger-messages';

@Injectable()
export class AzureStorageService implements OnModuleInit {
    private blob_service_client: BlobServiceClient;
    private profile_image_container_name: string;

    constructor(private readonly configService: ConfigService) {}

    onModuleInit() {
        const connection_string = this.configService.get<string>('AZURE_STORAGE_CONNECTION_STRING');

        if (!connection_string) {
            throw new Error('AZURE_STORAGE_CONNECTION_STRING is not defined');
        }

        this.blob_service_client = BlobServiceClient.fromConnectionString(connection_string);
        this.profile_image_container_name =
            this.configService.get<string>('AZURE_STORAGE_PROFILE_IMAGE_CONTAINER') ||
            'profile-images';
    }

    getContainerClient(conatainer_name?: string): ContainerClient {
        return this.blob_service_client.getContainerClient(
            conatainer_name || this.profile_image_container_name
        );
    }

    async uploadFile(
        file_buffer: Buffer,
        file_name: string,
        container_name?: string
    ): Promise<string> {
        const container_client = this.getContainerClient(container_name);
        const block_blob_client = container_client.getBlockBlobClient(file_name);

        await block_blob_client.upload(file_buffer, file_buffer.length);

        return block_blob_client.url;
    }

    async deleteFile(file_name: string, container_name?: string): Promise<void> {
        const container_client = this.getContainerClient(container_name);
        const block_blob_client = container_client.getBlockBlobClient(file_name);

        const exists = await block_blob_client.exists();
        if (!exists) {
            throw new NotFoundException(ERROR_MESSAGES.FILE_NOT_FOUND);
        }

        await block_blob_client.delete();
    }

    generateFileName(user_id: string, original_name: string): string {
        return `${user_id}-${Date.now()}-${original_name}`;
    }

    extractFileName(file_url: string): string {
        const file_name = file_url.split('/').pop();
        if (!file_name) {
            throw new BadRequestException(ERROR_MESSAGES.INVALID_FILE_URL);
        }
        return file_name;
    }

    extractUserIdFromFileName(file_name: string): string {
        const parts = file_name.split('-');
        return parts.slice(0, 5).join('-');
    }
}
