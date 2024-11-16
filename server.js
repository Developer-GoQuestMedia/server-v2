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

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/dialogues', dialogueRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/audio', audioRoutes);
app.use((req, res, next) => {
    console.log('Available routes:', app._router.stack.filter(r => r.route).map(r => r.route.path));
    next();
});

// Debug route registration
app._router.stack.forEach(function(r){
    if (r.route && r.route.path){
        console.log(`Route registered: ${r.route.stack[0].method.toUpperCase()} ${r.route.path}`);
    }
});

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
