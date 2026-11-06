const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { protectAdmin } = require('../middleware/auth');
const {
  getResources,
  getResourceById,
  downloadResource,
  uploadResource,
  updateResource,
  deleteResource,
} = require('../controllers/resourceController');

// Public routes
router.get('/', getResources);
router.get('/:id', getResourceById);
router.get('/:id/download', downloadResource);

// Admin protected routes
router.post('/', protectAdmin, upload.single('pdf'), uploadResource);
router.put('/:id', protectAdmin, updateResource);
router.delete('/:id', protectAdmin, deleteResource);

module.exports = router;

