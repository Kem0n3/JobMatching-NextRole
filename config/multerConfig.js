const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../public/uploads/resumes');

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${req.user.id}-${Date.now()}`;
        const extension = path.extname(file.originalname).toLowerCase();
        cb(null, `resume-${uniqueSuffix}${extension}`);
    }
});

const allowedExtensions = new Set(['.pdf', '.doc', '.docx']);

const fileFilter = (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();

    if (allowedExtensions.has(extension)) {
        return cb(null, true);
    }

    return cb(new Error('Only PDF, DOC, and DOCX files are accepted.'));
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024
    }
});

module.exports = upload;
