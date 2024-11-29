import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { promises as fs } from 'fs';
import path from 'path';
import mime from 'mime-types';

// Configure R2 client
const s3Client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_PUBLIC_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

async function getAllFiles(dirPath, arrayOfFiles = []) {
    const files = await fs.readdir(dirPath);

    for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stat = await fs.stat(filePath);

        if (stat.isDirectory()) {
            arrayOfFiles = await getAllFiles(filePath, arrayOfFiles);
        } else {
            arrayOfFiles.push(filePath);
        }
    }

    return arrayOfFiles;
}

async function uploadToR2(localFolderPath = './Demo') {
    try {
        // Get all files recursively
        const allFiles = await getAllFiles(localFolderPath);
        console.log(`Found ${allFiles.length} files to upload`);

        // Upload each file
        for (const filePath of allFiles) {
            const fileContent = await fs.readFile(filePath);
            const relativeFilePath = path.relative(localFolderPath, filePath);
            
            // Add the folder prefix to the key
            const keyWithFolder = `Kuma Ep 01 Recording Clip/${relativeFilePath}`;
            
            // Determine content type
            const contentType = mime.lookup(filePath) || 'application/octet-stream';

            const uploadParams = {
                Bucket: process.env.R2_BUCKET_NAME,
                Key: keyWithFolder,  // Use the new key with folder
                // Key: relativeFilePath,  // Use the new key with folder
                Body: fileContent,
                ContentType: contentType
            };

            await s3Client.send(new PutObjectCommand(uploadParams));
            // console.log(`Successfully uploaded: ${keyWithFolder}`);
            console.log(`Successfully uploaded: ${relativeFilePath}`);

        }

        console.log('Upload completed successfully!');
    } catch (error) {
        console.error('Error uploading files:', error);
        throw error;
    }
}

async function emptyR2Bucket() {
    try {
        console.log('Starting bucket cleanup...');
        
        // List all objects in the bucket
        const listCommand = new ListObjectsV2Command({
            Bucket: process.env.R2_BUCKET_NAME,
        });

        let isTruncated = true;
        let contents = [];

        while (isTruncated) {
            const { Contents, IsTruncated, NextContinuationToken } = await s3Client.send(listCommand);
            
            if (Contents) {
                contents.push(...Contents);
            }
            
            isTruncated = IsTruncated;
            if (isTruncated) {
                listCommand.input.ContinuationToken = NextContinuationToken;
            }
        }

        if (contents.length === 0) {
            console.log('Bucket is already empty');
            return;
        }

        // Delete each object
        for (const object of contents) {
            const deleteCommand = new DeleteObjectCommand({
                Bucket: process.env.R2_BUCKET_NAME,
                Key: object.Key,
            });

            await s3Client.send(deleteCommand);
            console.log(`Deleted: ${object.Key}`);
        }

        console.log(`Successfully deleted ${contents.length} files from the bucket`);
    } catch (error) {
        console.error('Error emptying bucket:', error);
        throw error;
    }
}

export { uploadToR2, emptyR2Bucket };
