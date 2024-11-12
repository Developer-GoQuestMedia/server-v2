import express from 'express';
import multer from 'multer';

const router = express.Router();
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/upload', upload.single('audio'), async (req, res) => {
    res.json({ message: "Audio upload route working" });
});

export default router;
