// // src/constants.ts
// import { BlobServiceClient } from "@azure/storage-blob";

// export const AZURE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING ?? "";

// // Container for tweet images
// export const TWEET_IMAGES_CONTAINER = "tweet-images";

// export const blobServiceClient = BlobServiceClient.fromConnectionString(
//   AZURE_CONNECTION_STRING
// );

// export const uploadImageToAzure = async (
//   imageBuffer: Buffer,
//   imageName: string,
//   containerName: string
// ) => {
//   const containerClient = blobServiceClient.getContainerClient(containerName);

//   await containerClient.createIfNotExists(); // creates container if missing

//   const blockBlobClient = containerClient.getBlockBlobClient(imageName);

//   // Upload the image buffer directly
//   await blockBlobClient.upload(imageBuffer, imageBuffer.length);

//   return blockBlobClient.url; // ✅ Azure URL returned
// };
