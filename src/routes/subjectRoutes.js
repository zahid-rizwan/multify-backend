const express = require('express');
const router = express.Router();
const {
  getSubjects,
  getSubjectById,
  createSubject,
  deleteSubject,
} = require('../controllers/subjectController');
const { protectAdmin } = require('../middleware/auth');

router.get('/', getSubjects);
router.get('/:id', getSubjectById);
router.post('/', protectAdmin, createSubject);
router.delete('/:id', protectAdmin, deleteSubject);

module.exports = router;

