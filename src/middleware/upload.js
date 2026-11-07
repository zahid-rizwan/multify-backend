const multer = require('multer');
const path = require('path');

// Use MemoryStorage for 100% compatibility with Serverless / Vercel / Cloud environments
// This eliminates "EROFS: read-only file system" errors
const storage = multer.memoryStorage();

// File filter: strict PDF only
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (file.mimetype === 'application/pdf' || ext === '.pdf') {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type! Only PDF (.pdf) documents are accepted.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15 MB limit (MongoDB document limit is 16MB)
  },
});

module.exports = upload;
