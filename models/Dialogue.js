import mongoose from 'mongoose';

const DialogueSchema = new mongoose.Schema({
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Project",
        required: true,
    },
    index: { type: Number, required: true },
    timeStart: { type: String, required: true },
    timeEnd: { type: String, required: true },
    character: { type: String },
    videoUrl: { type: String },
    dialogue: {
        original: { type: String, required: true },
        translated: { type: String },
        adapted: { type: String }
    },
    emotions: {
        primary: {
            emotion: { type: String },
            intensity: { type: Number }
        },
        secondary: {
            emotion: { type: String },
            intensity: { type: Number }
        }
    },
    direction: { type: String },
    lipMovements: { type: Number },
    sceneContext: { type: String },
    technicalNotes: { type: String },
    culturalNotes: { type: String },
    audioUrl: { type: String },
    status: {
        type: String,
        enum: ["pending", "recorded", "approved"],
        default: "pending"
    },
    lastEditedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    videoIndex: {
        type: Number,
        required: true,
        default: 0
    },
}, { timestamps: true });

export const Dialogue = mongoose.model("Dialogue", DialogueSchema);
