const Resource = require('../models/Resource');
const Subject = require('../models/Subject');

// @desc    Get Admin Dashboard Stats
// @route   GET /api/admin/stats
// @access  Protected (Admin)
exports.getDashboardStats = async (req, res) => {
  try {
    const [totalResources, totalSubjects, resources] = await Promise.all([
      Resource.countDocuments(),
      Subject.countDocuments(),
      Resource.find().select('downloadCount viewCount docType'),
    ]);

    let totalDownloads = 0;
    let totalViews = 0;
    let pyqCount = 0;
    let noteCount = 0;

    resources.forEach((r) => {
      totalDownloads += r.downloadCount || 0;
      totalViews += r.viewCount || 0;
      if (r.docType === 'PYQ') pyqCount += 1;
      if (r.docType === 'NOTE') noteCount += 1;
    });

    const recentUploads = await Resource.find()
      .populate('subject', 'name code')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      stats: {
        totalResources,
        totalSubjects,
        totalDownloads,
        totalViews,
        pyqCount,
        noteCount,
      },
      recentUploads,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin stats',
      error: error.message,
    });
  }
};

