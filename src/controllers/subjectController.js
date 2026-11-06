const Subject = require('../models/Subject');
const Resource = require('../models/Resource');

// @desc    Get all subjects with resource count breakdown
// @route   GET /api/subjects
// @access  Public
exports.getSubjects = async (req, res) => {
  try {
    const subjects = await Subject.find().sort({ semester: 1, name: 1 });

    // Aggregate resource counts for each subject
    const counts = await Resource.aggregate([
      { $match: { status: 'published' } },
      {
        $group: {
          _id: { subject: '$subject', docType: '$docType' },
          count: { $sum: 1 },
        },
      },
    ]);

    const countMap = {};
    counts.forEach((item) => {
      const subId = item._id.subject.toString();
      if (!countMap[subId]) {
        countMap[subId] = { pyqCount: 0, noteCount: 0, total: 0 };
      }
      if (item._id.docType === 'PYQ') {
        countMap[subId].pyqCount += item.count;
      } else if (item._id.docType === 'NOTE') {
        countMap[subId].noteCount += item.count;
      }
      countMap[subId].total += item.count;
    });

    const subjectsWithCounts = subjects.map((subj) => {
      const stats = countMap[subj._id.toString()] || {
        pyqCount: 0,
        noteCount: 0,
        total: 0,
      };
      return {
        ...subj.toObject(),
        pyqCount: stats.pyqCount,
        noteCount: stats.noteCount,
        totalResources: stats.total,
      };
    });

    res.json({
      success: true,
      count: subjectsWithCounts.length,
      data: subjectsWithCounts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve subjects',
      error: error.message,
    });
  }
};

// @desc    Get single subject by ID
// @route   GET /api/subjects/:id
// @access  Public
exports.getSubjectById = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found',
      });
    }

    res.json({
      success: true,
      data: subject,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching subject',
      error: error.message,
    });
  }
};

// @desc    Create new subject
// @route   POST /api/subjects
// @access  Admin
exports.createSubject = async (req, res) => {
  try {
    const { name, code, semester, description, icon, color } = req.body;

    if (!name || !code || !semester) {
      return res.status(400).json({
        success: false,
        message: 'Please provide subject name, code, and semester',
      });
    }

    const existing = await Subject.findOne({ name });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Subject with this name already exists',
      });
    }

    const subject = await Subject.create({
      name,
      code,
      semester,
      description,
      icon: icon || 'microscope',
      color: color || '#00828A',
    });

    res.status(201).json({
      success: true,
      message: 'Subject created successfully',
      data: subject,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create subject',
      error: error.message,
    });
  }
};

