const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Subject name is required'],
      trim: true,
      unique: true,
    },
    code: {
      type: String,
      required: [true, 'Subject code is required (e.g., MLT-301)'],
      trim: true,
      uppercase: true,
    },
    semester: {
      type: Number,
      required: false,
      min: 1,
      max: 8,
    },
    description: {
      type: String,
      default: '',
    },
    icon: {
      type: String,
      default: 'microscope', // e.g. microscope, flask, vial, dna, activity
    },
    color: {
      type: String,
      default: '#00828A',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Subject', subjectSchema);

