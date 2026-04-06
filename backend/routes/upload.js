const express = require('express');
const router = express.Router();
const { upload } = require('../config/cloudinary');
const { authenticateJWT } = require('../middleware/auth');

router.post('/', authenticateJWT, upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        res.json({
            message: 'File uploaded successfully',
            url: req.file.path,
            filename: req.file.filename
        });
    } catch (error) {
        console.error('Error during upload:', error);
        res.status(500).json({ message: 'Server error during file upload', error: error.message });
    }
});

module.exports = router;
