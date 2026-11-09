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
    const resource = await Resource.findById(req.params.id).select('+fileData');

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found',
      });
    }

    // Increment download count asynchronously
    Resource.findByIdAndUpdate(req.params.id, { $inc: { downloadCount: 1 } }).exec();

    const downloadFileName = resource.originalFileName || `${resource.title}.pdf`;

    // 1. If PDF is stored directly in MongoDB buffer
    if (resource.fileData && resource.fileData.length > 0) {
      res.setHeader('Content-Type', resource.mimeType || 'application/pdf');
      res.setHeader('Content-Length', resource.fileData.length);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(downloadFileName)}"`
      );
      return res.send(resource.fileData);
    }

    // 2. Fallback for files saved on disk
    if (resource.fileName) {
      const filePath = path.join(__dirname, '../../uploads/pdfs', resource.fileName);
      if (fs.existsSync(filePath)) {
        return res.download(filePath, downloadFileName);
      }
    }

    return res.status(404).json({
      success: false,
      message: 'The requested PDF file does not exist on server storage or database',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Download error',
      error: error.message,
    });
  }
};

// @desc    Stream PDF inline for in-browser viewer/modal
// @route   GET /api/resources/:id/pdf
// @access  Public
exports.streamPdf = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id).select('+fileData');

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found',
      });
    }

    // Increment view count asynchronously
    Resource.findByIdAndUpdate(req.params.id, { $inc: { viewCount: 1 } }).exec();

    const viewFileName = resource.originalFileName || `${resource.title}.pdf`;

    // 1. If PDF is stored in MongoDB buffer
    if (resource.fileData && resource.fileData.length > 0) {
      res.setHeader('Content-Type', resource.mimeType || 'application/pdf');
      res.setHeader('Content-Length', resource.fileData.length);
      res.setHeader(
        'Content-Disposition',
        `inline; filename="${encodeURIComponent(viewFileName)}"`
      );
      return res.send(resource.fileData);
    }

    // 2. Fallback to disk
    if (resource.fileName) {
      const filePath = path.join(__dirname, '../../uploads/pdfs', resource.fileName);
      if (fs.existsSync(filePath)) {
        res.setHeader('Content-Type', resource.mimeType || 'application/pdf');
        res.setHeader(
          'Content-Disposition',
          `inline; filename="${encodeURIComponent(viewFileName)}"`
        );
        return res.sendFile(filePath);
      }
    }

    return res.status(404).json({
      success: false,
      message: 'PDF file content could not be located on server or database',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error streaming PDF file',
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

    if (!title || !subject || !docType || !year) {
      return res.status(400).json({
        success: false,
        message: 'Please provide Title, Subject, Document Type (PYQ/NOTE), and Year.',
      });
    }

    // Verify subject exists
    const subjectExists = await Subject.findById(subject);
    if (!subjectExists) {
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

    // Clean filename for storage
    const cleanOriginalName = (req.file.originalname || 'document.pdf').replace(/[^a-zA-Z0-9.-]/g, '_');
    const safeFileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${cleanOriginalName}`;

    // Get buffer and size
    const fileBuffer = req.file.buffer;
    const fileSize = req.file.size || (fileBuffer ? fileBuffer.length : 0);

    const newResource = new Resource({
      title,
      subject,
      docType: docType.toUpperCase(),
      semester: semester ? Number(semester) : undefined,
      year: Number(year),
      session: session || 'Annual Exam',
      description: description || '',
      tags: parsedTags,
      fileName: req.file.filename || safeFileName,
      originalFileName: req.file.originalname || 'document.pdf',
      fileSize: fileSize,
      mimeType: req.file.mimetype || 'application/pdf',
      fileData: fileBuffer, // Stored safely in MongoDB Atlas!
      status: 'published',
    });

    // Stream URL pointing directly to serverless streaming endpoint
    newResource.fileUrl = `/api/resources/${newResource._id}/pdf`;
    await newResource.save();

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
    if (semester !== undefined) resource.semester = semester ? Number(semester) : undefined;
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

