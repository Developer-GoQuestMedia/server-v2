import express from 'express';
import multer from 'multer';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Dialogue } from '../models/Dialogue.js';

const router = express.Router();
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } });

const s3Client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_PUBLIC_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true,
    signatureVersion: 'v4'
});

router.post('/upload', upload.single('audio'), async (req, res) => {
    console.log('Route hit!');
    console.log('Request body:', req.body);
    console.log('Request file:', req.file);
    try {
        // console.log('Environment variables:', {
        //     endpoint: process.env.R2_PUBLIC_ENDPOINT,
        //     bucket: process.env.R2_BUCKET_NAME,
        //     publicUrl: process.env.R2_BUCKET_ENDPOINT
        // });

        const { dialogueId } = req.body;
        if (!req.file || !dialogueId) {
            return res.status(400).json({ error: 'Audio file and dialogueId are required' });
        }

        if (!process.env.R2_BUCKET_NAME) {
            throw new Error('Bucket name is not configured');
        }

        const dialogue = await Dialogue.findById(dialogueId);
        if (!dialogue) {
            return res.status(404).json({ error: 'Dialogue not found' });
        }

        const folderPath = 'Kuma Ep 01/recordings/';

        const filename = decodeURIComponent(req.file.originalname);
        console.log('Filename:', filename); 
        const fullPath = `${folderPath}${filename}`;
        console.log('Full path:', fullPath);
        
        const uploadParams = {
            Bucket: process.env.R2_BUCKET_NAME,
            Key: fullPath,
            Body: req.file.buffer,
            ContentType: 'audio/wav',
        };
        console.log("///////////////////////////////");
        

        console.log('Upload params:', uploadParams);

        await s3Client.send(new PutObjectCommand(uploadParams));

        const audioUrl = `${process.env.R2_BUCKET_ENDPOINT}${fullPath}`;

        await Dialogue.findByIdAndUpdate(dialogueId, {
            audioUrl: audioUrl,
            status: 'recorded'
        });

        res.json({ 
            message: "Audio uploaded successfully",
            audioUrl
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ 
            error: 'Failed to upload audio',
            details: error.message 
        });
    }
});

export default router;
