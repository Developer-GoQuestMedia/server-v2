import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import { validateEnvironment, validateMongoDBConnection } from './utils/db.js';
import dialogueRoutes from './routes/dialogue.js';
import videoRoutes from './routes/video.js';
import audioRoutes from './routes/audio.js';

dotenv.config();

const app = express();

// Enhanced CORS configuration
app.use(cors({
    origin: ['http://localhost:3000','http://localhost:5174', 'https://developer-goquestmedia.github.io'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'Accept',
        'Range',  // Important for video streaming
        'Accept-Ranges',
        'Content-Range',
        'Content-Length'
    ],
    exposedHeaders: [
        'Content-Range',
        'Accept-Ranges',
        'Content-Length',
        'Content-Type'
    ],
    credentials: true,
    maxAge: 86400 // Cache CORS preflight requests for 24 hours
}));


app.use(express.json());




// Routes
app.use('/api/dialogues', dialogueRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/audio', audioRoutes);


const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        validateEnvironment();
        await validateMongoDBConnection();
        app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    } catch (error) {
        console.error('Server startup error:', error.message);
        process.exit(1);
    }
};

startServer();
