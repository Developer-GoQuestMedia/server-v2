import express from 'express';
import { Dialogue } from '../models/Dialogue.js';
import mongoose from 'mongoose';

const router = express.Router();

// GET /api/dialogues/list/:projectId - Get all dialogues for a project
router.get('/list/:projectId', async (req, res) => {
    try {
        const { projectId } = req.params;

        // Validate if projectId is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(projectId)) {
            return res.status(400).json({ 
                message: 'Invalid project ID format',
                projectId 
            });
        }

        const dialogues = await Dialogue.find({ project: projectId })
            .sort({ videoIndex: 1, index: 1 })
            .populate('lastEditedBy', 'name email')
            .lean();
        
        res.json(dialogues);
    } catch (error) {
        console.error('Error listing dialogues:', error);
        res.status(500).json({ 
            message: 'Error listing dialogues',
            error: process.env.NODE_ENV === 'development' ? error.message : {}
        });
    }
});

// GET /api/dialogues/video/:videoUrl - Get dialogues for specific video
router.get('/video/:videoUrl', async (req, res) => {
    try {
        const videoUrl = decodeURIComponent(req.params.videoUrl);
        
        const dialogues = await Dialogue.find({ videoUrl })
            .sort({ videoIndex: 1, index: 1 })
            .populate('lastEditedBy', 'name email')
            .lean();
        
        if (!dialogues.length) {
            return res.status(404).json({ 
                message: 'No dialogues found for this video',
                videoUrl 
            });
        }

        res.json(dialogues);
    } catch (error) {
        console.error('Error fetching video dialogues:', error);
        res.status(500).json({ 
            message: 'Error fetching video dialogues',
            error: process.env.NODE_ENV === 'development' ? error.message : {}
        });
    }
});

// POST /api/dialogues - Create new dialogue
// router.post('/', async (req, res) => {
//     try {
//         const dialogueData = {
//             project: req.body.project,
//             index: req.body.index,
//             timeStart: req.body.timeStart,
//             timeEnd: req.body.timeEnd,
//             character: req.body.character,
//             videoUrl: req.body.videoUrl,
//             dialogue: {
//                 original: req.body.dialogue.original,
//                 translated: req.body.dialogue.translated,
//                 adapted: req.body.dialogue.adapted
//             },
//             emotions: {
//                 primary: {
//                     emotion: req.body.emotions.primary.emotion,
//                     intensity: req.body.emotions.primary.intensity
//                 },
//                 secondary: {
//                     emotion: req.body.emotions.secondary.emotion,
//                     intensity: req.body.emotions.secondary.intensity
//                 }
//             },
//             direction: req.body.direction,
//             lipMovements: req.body.lipMovements,
//             sceneContext: req.body.sceneContext,
//             technicalNotes: req.body.technicalNotes,
//             culturalNotes: req.body.culturalNotes,
//             status: req.body.status || 'pending',
//             videoIndex: req.body.videoIndex || 0,
//             lastEditedBy: req.user._id // Assuming you have user authentication middleware
//         };

//         const dialogue = new Dialogue(dialogueData);
//         await dialogue.save();
        
//         res.status(201).json(dialogue);
//     } catch (error) {
//         console.error('Error creating dialogue:', error);
//         res.status(500).json({ 
//             message: 'Error creating dialogue',
//             error: process.env.NODE_ENV === 'development' ? error.message : {}
//         });
//     }
// });

// PUT /api/dialogues/:id - Update dialogue
router.put('/:id', async (req, res) => {
    try {
        const dialogueId = req.params.id;
        
        // Remove the lastEditedBy field if no user in request
        const updateData = {
            ...req.body
        };
        
        // Check if user has approval rights when status is being changed to 'approved'
        if (updateData.status === 'approved' && (!req.user?.canApprove)) {
            return res.status(403).json({ 
                message: 'User does not have approval rights'
            });
        }
        
        // Only add lastEditedBy if req.user exists
        if (req.user && req.user._id) {
            updateData.lastEditedBy = req.user._id;
        }

        // Validate if dialogueId is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(dialogueId)) {
            return res.status(400).json({ 
                message: 'Invalid dialogue ID format',
                dialogueId 
            });
        }

        const dialogue = await Dialogue.findByIdAndUpdate(
            dialogueId,
            updateData,
            { new: true, runValidators: true }
        ).populate('lastEditedBy', 'name email');

        if (!dialogue) {
            return res.status(404).json({ message: 'Dialogue not found' });
        }

        res.json(dialogue);
    } catch (error) {
        console.error('Error updating dialogue:', error);
        res.status(500).json({ 
            message: 'Error updating dialogue',
            error: process.env.NODE_ENV === 'development' ? error.message : {}
        });
    }
});

// DELETE /api/dialogues/:id - Delete dialogue
router.delete('/:id', async (req, res) => {
    try {
        const dialogueId = req.params.id;
        const dialogue = await Dialogue.findByIdAndDelete(dialogueId);

        if (!dialogue) {
            return res.status(404).json({ message: 'Dialogue not found' });
        }

        res.json({ message: 'Dialogue deleted successfully' });
    } catch (error) {
        console.error('Error deleting dialogue:', error);
        res.status(500).json({ 
            message: 'Error deleting dialogue',
            error: process.env.NODE_ENV === 'development' ? error.message : {}
        });
    }
});

export default router;
