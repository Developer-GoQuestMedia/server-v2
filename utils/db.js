import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

export const validateEnvironment = () => {
    const requiredEnvVars = [
        'MONGODB_URI',
        'R2_BUCKET_NAME',
        'R2_ACCESS_KEY_ID',
        'R2_SECRET_ACCESS_KEY',
        'R2_ACCOUNT_ID',
        'R2_TOKEN',
        'R2_PUBLIC_ENDPOINT',
        'R2_BUCKET_ENDPOINT',
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    console.log('All required environment variables are set.');
};

export const validateMongoDBConnection = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB connection successful.');
    } catch (error) {
        throw new Error(`MongoDB connection failed: ${error.message}`);
    }
};
