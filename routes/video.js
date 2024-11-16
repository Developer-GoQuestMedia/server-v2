import express from 'express';
import { GetObjectCommand, ListObjectsCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2Client } from '../utils/r2.js';
import { formatDateTime, getValidCachedUrl, setCacheUrl, cleanupExpiredCache } from '../utils/videoCache.js';
import { Readable } from 'stream';

const router = express.Router();


// List route should come first
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
        res.status(500).json({ 
            message: 'Error listing videos',
            error: process.env.NODE_ENV === 'development' ? error.message : {}
        });
    }
});

// Streaming route
router.get('/stream/:path(*)', async (req, res) => {
    try {
        let key = req.params.path;
        
        // Log basic request info
        console.log(`[${new Date().toISOString()}] Streaming request for: ${key}`);
        
        // Ensure correct video path structure
        if (key.startsWith('Kuma/') && !key.includes('video/')) {
            key = key.replace('Kuma/', 'Kuma/video/');
        }

        const getCommand = new GetObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: key
        });

        try {
            const { Body, ContentType, ContentLength } = await r2Client.send(getCommand);
            
            // Set streaming headers
            res.setHeader('Content-Type', ContentType);
            res.setHeader('Content-Length', ContentLength);
            res.setHeader('Accept-Ranges', 'bytes');
            res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
            
            // Handle range requests for seeking
            const range = req.headers.range;
            if (range) {
                const parts = range.replace(/bytes=/, '').split('-');
                const start = parseInt(parts[0], 10);
                const end = parts[1] ? parseInt(parts[1], 10) : ContentLength - 1;
                const chunksize = (end - start) + 1;
                
                res.setHeader('Content-Range', `bytes ${start}-${end}/${ContentLength}`);
                res.setHeader('Content-Length', chunksize);
                res.status(206);
                console.log(`Serving range request: bytes ${start}-${end}/${ContentLength}`);
            }

            // Stream the video data
            if (Body instanceof Readable) {
                Body.pipe(res);
            } else {
                const stream = Readable.from(Body);
                stream.pipe(res);
            }

        } catch (error) {
            if (error.$metadata?.httpStatusCode === 404 || error.name === 'NoSuchKey') {
                console.error(`Video not found: ${key}`);
                return res.status(404).json({ 
                    message: 'Video not found',
                    key: key
                });
            }
            throw error;
        }
    } catch (error) {
        console.error('Error streaming video:', error);
        res.status(500).json({ 
            message: 'Error streaming video',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Original signed URL route should come last
router.get('/:path(*)', async (req, res) => {
    try {
        let key = req.params.path;
        
        if (!key || key.trim().length === 0) {
            return res.status(400).json({ message: 'Invalid video path' });
        }

        if (key.startsWith('Kuma/') && !key.includes('video/')) {
            key = key.replace('Kuma/', 'Kuma/video/');
        }

        const cachedUrl = getValidCachedUrl(key);
        if (cachedUrl) {
            const remainingTime = Math.floor((cachedUrl.expiresAt - Date.now()) / 1000);
            return res.json({
                url: cachedUrl.url,
                key: key,
                originalPath: req.params.path,
                expiresIn: remainingTime,
                expiresAt: cachedUrl.expiresAt,
                expiresAtFormatted: formatDateTime(cachedUrl.expiresAt),
                cached: true
            });
        }

        const getCommand = new GetObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: key
        });

        try {
            await r2Client.send(getCommand);
            const expiresIn = 900;
            const presignedUrl = await getSignedUrl(r2Client, getCommand, { expiresIn });
            
            const now = Date.now();
            const expiresAt = now + (expiresIn * 1000);
            
            setCacheUrl(key, presignedUrl, expiresIn);

            res.json({
                url: presignedUrl,
                key: key,
                originalPath: req.params.path,
                expiresIn: expiresIn,
                expiresAt: expiresAt,
                expiresAtFormatted: formatDateTime(expiresAt),
                cached: false
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
        res.status(500).json({ 
            message: 'Error generating video URL',
            error: process.env.NODE_ENV === 'development' ? error.message : {}
        });
    }
});

// Start the cache cleanup interval
setInterval(cleanupExpiredCache, 60000);


export default router;
