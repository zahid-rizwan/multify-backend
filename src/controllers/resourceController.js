const path = require('path');
const fs = require('fs');
const Resource = require('../models/Resource');
const Subject = require('../models/Subject');

// @desc    Get resources with search & filter
// @route   GET /api/resources
// @access  Public
exports.getResources = async (req, res) => {
  try {
    const {
      subject,
      docType,
      semester,
      year,
      search,
      sort = 'newest',
      page = 1,
      limit = 20,
    } = req.query;

    const query = { status: 'published' };

    // Subject filter
    if (subject) {
      query.subject = subject;
    }

    // docType filter (PYQ or NOTE)
    if (docType && ['PYQ', 'NOTE'].includes(docType.toUpperCase())) {
      query.docType = docType.toUpperCase();
    }

    // Semester filter
    if (semester) {
      query.semester = Number(semester);
    }

    // Year filter
    if (year) {
      query.year = Number(year);
    }

    // Search query (matches title, tags, description)
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { tags: searchRegex },
        { session: searchRegex },
      ];
    }

    // Sorting
    let sortOptions = { createdAt: -1 };
    if (sort === 'oldest') {
      sortOptions = { createdAt: 1 };
    } else if (sort === 'downloads') {
      sortOptions = { downloadCount: -1 };
    } else if (sort === 'views') {
      sortOptions = { viewCount: -1 };
    } else if (sort === 'title') {
      sortOptions = { title: 1 };
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [resources, total] = await Promise.all([
      Resource.find(query)
        .populate('subject', 'name code color icon semester')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum),
      Resource.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: resources,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve resources',
      error: error.message,
    });
  }
};

// @desc    Get single resource and increment view count
// @route   GET /api/resources/:id
// @access  Public
exports.getResourceById = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id).populate(
      'subject',
      'name code color icon semester'
    );

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found',
      });
    }

    // Increment view count asynchronously
    resource.viewCount += 1;
    await resource.save();

    res.json({
      success: true,
      data: resource,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching resource',
      error: error.message,
    });
  }
};

// @desc    Download PDF and increment download count
// @route   GET /api/resources/:id/download
// @access  Public
exports.downloadResource = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found',
      });
    }

    const filePath = path.join(__dirname, '../../uploads/pdfs', resource.fileName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'The requested PDF file does not exist on server storage',
      });
    }

    // Increment download count
    resource.downloadCount += 1;
    await resource.save();

    // Stream download with friendly filename
    res.download(filePath, resource.originalFileName || `${resource.title}.pdf`);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Download error',
      error: error.message,
    });
  }
};

// @desc    Admin: Upload new resource (PDF + metadata)
// @route   POST /api/resources
// @access  Protected (Admin)
exports.uploadResource = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'PDF file is required. Please attach a valid .pdf document.',
      });
    }

    const {
      title,
      subject,
      docType,
      semester,
      year,
      session,
      description,
      tags,
    } = req.body;

    if (!title || !subject || !docType || !semester || !year) {
      // Remove uploaded file if validation fails
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: 'Please provide Title, Subject, Document Type (PYQ/NOTE), Semester, and Year.',
      });
    }

    // Verify subject exists
    const subjectExists = await Subject.findById(subject);
    if (!subjectExists) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: 'Specified subject does not exist',
      });
    }

    // Parse tags if provided as comma-separated or JSON
    let parsedTags = [];
    if (tags) {
      if (Array.isArray(tags)) {
        parsedTags = tags;
      } else if (typeof tags === 'string') {
        parsedTags = tags.split(',').map((t) => t.trim()).filter(Boolean);
      }
    }

    const fileUrl = `/uploads/pdfs/${req.file.filename}`;

    const newResource = await Resource.create({
      title,
      subject,
      docType: docType.toUpperCase(),
      semester: Number(semester),
      year: Number(year),
      session: session || 'Annual Exam',
      description: description || '',
      tags: parsedTags,
      fileUrl,
      fileName: req.file.filename,
      originalFileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      status: 'published',
    });

    const populatedResource = await Resource.findById(newResource._id).populate(
      'subject',
      'name code color icon semester'
    );

    res.status(201).json({
      success: true,
      message: 'Resource uploaded and published successfully!',
      data: populatedResource,
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      success: false,
      message: 'Failed to upload resource',
      error: error.message,
    });
  }
};

// @desc    Admin: Update resource metadata
// @route   PUT /api/resources/:id
// @access  Protected (Admin)
exports.updateResource = async (req, res) => {
  try {
    const { title, subject, docType, semester, year, session, description, tags, status } =
      req.body;

    const resource = await Resource.findById(req.params.id);
    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found',
      });
    }

    if (title) resource.title = title;
    if (subject) resource.subject = subject;
    if (docType) resource.docType = docType.toUpperCase();
    if (semester) resource.semester = Number(semester);
    if (year) resource.year = Number(year);
    if (session) resource.session = session;
    if (description !== undefined) resource.description = description;
    if (status) resource.status = status;
    if (tags) {
      resource.tags = Array.isArray(tags)
        ? tags
        : tags.split(',').map((t) => t.trim()).filter(Boolean);
    }

    await resource.save();

    const updated = await Resource.findById(resource._id).populate(
      'subject',
      'name code color icon semester'
    );

    res.json({
      success: true,
      message: 'Resource updated successfully',
      data: updated,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update resource',
      error: error.message,
    });
  }
};

// @desc    Admin: Delete resource and associated PDF file
// @route   DELETE /api/resources/:id
// @access  Protected (Admin)
exports.deleteResource = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found',
      });
    }

    // Delete file from disk if present
    const filePath = path.join(__dirname, '../../uploads/pdfs', resource.fileName);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.warn('Could not remove file from disk:', err.message);
      }
    }

    await Resource.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Resource and file deleted successfully',
      deletedId: req.params.id,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete resource',
      error: error.message,
    });
  }
};

