import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';

@Injectable()
export class AzureStorageService implements OnModuleInit {
    private blob_service_client: BlobServiceClient;
    private profile_image_container_name: string;

    constructor(private configService: ConfigService) {}

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

    async uploadImage(
        image_buffer: Buffer,
        image_name: string,
        container_name?: string
    ): Promise<string> {
        const container_client = this.getContainerClient(container_name);
        const block_blob_client = container_client.getBlockBlobClient(image_name);

        await block_blob_client.upload(image_buffer, image_buffer.length);

        return block_blob_client.url;
    }

    async deleteImage(image_name: string, container_name?: string): Promise<void> {
        const container_client = this.getContainerClient(container_name);
        const block_blob_client = container_client.getBlockBlobClient(image_name);
        await block_blob_client.delete();
    }

    generateImageName(user_id: string, original_name: string): string {
        return `${user_id}-${Date.now()}-${original_name}`;
    }
}
