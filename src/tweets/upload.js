// from here to the line with #####, that should be in the constants.js file
// container names and connection setup for Azure will be from Anas (ya rb yngz)

import {BlobServiceClient} from "@azure/storage-blob";

const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
// Initialize Blob Service Client
export const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);


// Container names
export const Profile_Picture_Container_Name = process.env.AZURE_STORAGE_PROFILE_PICTURE_CONTAINER;
// ---
// ---


export const uploadImageToAzure = async (image_buffer, image_name, container_client) => {
    const blockBlobClient = container_client.getBlockBlobClient(image_name);
    await blockBlobClient.upload(image_buffer, image_buffer.length);
    return blockBlobClient.url; // Return URL of uploaded image
};



//// example for how you should use these functions
import {blobServiceClient, Profile_Picture_Container_Name, uploadImageToAzure} from "<bla_bla_bla>/constants.js";

export const uploadProfileImage = async (req, res) => {
    const user_id = req.user_id;
    const image_buffer = req.file.buffer;
    try {
        if (!image_buffer) {
            return res.status(400).send("No image file provided");
        }

        const container_client = blobServiceClient.getContainerClient(Profile_Picture_Container_Name);
        const image_name = `${user_id}-${Date.now()}-${req.file.originalname}`;
        const image_url = await uploadImageToAzure(image_buffer, image_name, container_client);

        return image_url;
    } catch (error) {
        console.error(error);
        return res.status(500).send("Error uploading image");
    }
};