const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Resource title is required'],
      trim: true,
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: [true, 'Associated subject is required'],
    },
    docType: {
      type: String,
      enum: {
        values: ['PYQ', 'NOTE'],
        message: 'docType must be either PYQ (Previous Year Question) or NOTE',
      },
      required: [true, 'Document type is required'],
    },
    semester: {
      type: Number,
      required: false,
      min: 1,
      max: 8,
    },
    year: {
      type: Number,
      required: [true, 'Year is required (e.g., 2024)'],
    },
    session: {
      type: String,
      default: 'Annual Exam',
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    fileUrl: {
      type: String,
      required: [true, 'PDF file URL/path is required'],
    },
    fileData: {
      type: Buffer,
      select: false, // Don't return binary buffer in large resource queries
    },
    fileName: {
      type: String,
      required: true,
    },
    originalFileName: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      default: 0, // in bytes
    },
    mimeType: {
      type: String,
      default: 'application/pdf',
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    downloadCount: {
      type: Number,
      default: 0,
    },
    viewCount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['published', 'archived'],
      default: 'published',
    },
  },
  {
    timestamps: true,
  }
);

// Text index for fast search across title, description, and tags
resourceSchema.index({ title: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Resource', resourceSchema);

