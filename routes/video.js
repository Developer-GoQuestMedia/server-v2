import express from 'express';
import { GetObjectCommand, ListObjectsCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2Client } from '../utils/r2.js';

const router = express.Router();

// List all videos route - MUST come before the /:path(*) route
router.get('/list', async (req, res) => {
    try {
        const command = new ListObjectsCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            ...(req.query.prefix && { Prefix: req.query.prefix })
        });

        const data = await r2Client.send(command);
        
        if (!data.Contents) {
            return res.json([]);
        }

        const videos = data.Contents.map(item => ({
            key: item.Key,
            size: item.Size,
            lastModified: item.LastModified
        }));

        res.json(videos);
    } catch (error) {
        console.error('Error listing videos:', error);
        res.status(500).json({ 
            message: 'Error listing videos',
            error: process.env.NODE_ENV === 'development' ? error.message : {}
        });
    }
});

// Single video route
router.get('/:path(*)', async (req, res) => {
    try {
        let key = req.params.path;
        
        if (!key || key.trim().length === 0) {
            return res.status(400).json({ message: 'Invalid video path' });
        }

        // Check if path starts with Kuma/ and doesn't include video/
        if (key.startsWith('Kuma/') && !key.includes('video/')) {
            // Insert 'video/' after 'Kuma/'
            key = key.replace('Kuma/', 'Kuma/video/');
        }
        
        const getCommand = new GetObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: key
        });

        try {
            await r2Client.send(getCommand);
            const presignedUrl = await getSignedUrl(r2Client, getCommand, { expiresIn: 3600 });
            
            res.json({
                url: presignedUrl,
                key: key,
                originalPath: req.params.path
            });
        } catch (error) {
            if (error.$metadata?.httpStatusCode === 404 || error.name === 'NoSuchKey') {
                return res.status(404).json({ 
                    message: 'Video not found',
                    key: key,
                    originalPath: req.params.path
                });
            }
            throw error;
        }
    } catch (error) {
        console.error('Error generating video URL:', error);
        res.status(500).json({ 
            message: 'Error generating video URL',
            error: process.env.NODE_ENV === 'development' ? error.message : {}
        });
    }
});

export default router;
