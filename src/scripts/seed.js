const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const User = require('../models/User');
const Subject = require('../models/Subject');
const Resource = require('../models/Resource');

// Minimal valid PDF binary buffer generator for sample test documents
const createDummyPdfBuffer = (title) => {
  const content = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length 120 >>
stream
BT
/F1 18 Tf
72 700 Td
(MLTify - ${title}) Tj
/F1 12 Tf
0 -30 Td
(Medical Laboratory Technology Study Material & Exam Repository) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000060 00000 n 
0000000117 00000 n 
0000000224 00000 n 
0000000295 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
468
%%EOF`;
  return Buffer.from(content, 'utf-8');
};

const seed = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mltify';
    console.log(`[MLTify Seed] Connecting to MongoDB: ${mongoUri}`);
    await mongoose.connect(mongoUri);

    console.log('[MLTify Seed] Cleaning existing collections...');
    await User.deleteMany({});
    await Subject.deleteMany({});
    await Resource.deleteMany({});

    // 1. Seed Admin User
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@mltify.com').toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@fahad07';
    await User.create({
      name: 'MLTify Head Administrator',
      email: adminEmail,
      password: adminPassword,
      role: 'admin',
    });
    console.log(`[MLTify Seed] ✅ Admin account created: ${adminEmail} (password: ${adminPassword})`);

    // 2. Seed Subjects
    const subjectsData = [
      {
        name: 'Clinical Hematology & Blood Banking',
        code: 'MLT-301',
        semester: 3,
        description: 'Coagulation studies, automated cell counters, ABO/Rh typing, anemia workup, and transfusion medicine.',
        icon: 'droplets',
        color: '#D82148',
      },
      {
        name: 'Clinical Biochemistry',
        code: 'MLT-302',
        semester: 3,
        description: 'Spectrophotometry, liver function tests, cardiac biomarkers, renal panels, and enzymatic kinetics.',
        icon: 'flask-conical',
        color: '#00828A',
      },
      {
        name: 'Medical Microbiology & Mycology',
        code: 'MLT-401',
        semester: 4,
        description: 'Gram staining, culture media, antimicrobial susceptibility testing (AST), and pathogenic fungi.',
        icon: 'microscope',
        color: '#0B1C2E',
      },
      {
        name: 'Histopathology & Cytotechnology',
        code: 'MLT-402',
        semester: 4,
        description: 'Tissue fixation, microtomy, H&E staining, frozen sections, and exfoliative cytology.',
        icon: 'layers',
        color: '#7C3AED',
      },
      {
        name: 'Immunology & Serology',
        code: 'MLT-501',
        semester: 5,
        description: 'Antigen-antibody reactions, ELISA, Western Blotting, immunofluorescence, and autoimmune panels.',
        icon: 'shield-check',
        color: '#059669',
      },
      {
        name: 'Clinical Pathology & Urinalysis',
        code: 'MLT-201',
        semester: 2,
        description: 'Routine physical, chemical, and microscopic examination of urine, CSF, and body fluids.',
        icon: 'test-tube',
        color: '#D97706',
      },
      {
        name: 'Molecular Biology & Diagnostic Genetics',
        code: 'MLT-601',
        semester: 6,
        description: 'Polymerase chain reaction (PCR), gel electrophoresis, DNA extraction, and FISH diagnostics.',
        icon: 'dna',
        color: '#2563EB',
      },
    ];

    const createdSubjects = await Subject.insertMany(subjectsData);
    console.log(`[MLTify Seed] ✅ Seeded ${createdSubjects.length} core MLT subjects`);

    // Ensure uploads folder exists
    const uploadsDir = path.join(__dirname, '../../uploads/pdfs');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // 3. Seed Sample PYQs and Notes
    const sampleResources = [
      {
        title: 'Clinical Biochemistry Annual Examination Question Paper 2024',
        subjectIndex: 1, // Clinical Biochemistry
        docType: 'PYQ',
        semester: 3,
        year: 2024,
        session: 'Annual Exam',
        description: 'Complete official question paper covering enzymology, liver function test, and lipid profile disorders.',
        fileName: 'biochem-pyq-2024.pdf',
        originalFileName: 'Biochemistry_Annual_PYQ_2024.pdf',
        tags: ['biochem', 'pyq', 'enzymes', '2024', 'lft'],
        downloadCount: 342,
        viewCount: 1120,
      },
      {
        title: 'Comprehensive Notes on Hematological Stains & RBC Indices',
        subjectIndex: 0, // Hematology
        docType: 'NOTE',
        semester: 3,
        year: 2024,
        session: 'Lecture Notes',
        description: 'High-yield revision notes detailing Leishman stain, Giemsa stain, MCV, MCH, and automated cell counters.',
        fileName: 'hematology-notes-rbc.pdf',
        originalFileName: 'Hematology_Lecture_Notes_RBC_Indices.pdf',
        tags: ['hematology', 'notes', 'staining', 'rbc', 'wbc'],
        downloadCount: 512,
        viewCount: 1490,
      },
      {
        title: 'Medical Microbiology University Past Paper 2023',
        subjectIndex: 2, // Microbiology
        docType: 'PYQ',
        semester: 4,
        year: 2023,
        session: 'Winter Session',
        description: 'Past university paper covering bacteriology, culture media classification, and antimicrobial susceptibility testing.',
        fileName: 'microbiology-pyq-2023.pdf',
        originalFileName: 'Microbiology_University_Paper_2023.pdf',
        tags: ['microbiology', 'pyq', 'bacteria', 'culture-media'],
        downloadCount: 289,
        viewCount: 890,
      },
      {
        title: 'Histotechnology Protocol Handbook: Tissue Processing & H&E Staining',
        subjectIndex: 3, // Histopathology
        docType: 'NOTE',
        semester: 4,
        year: 2024,
        session: 'Lab Protocol',
        description: 'Step-by-step laboratory guide on formalin fixation, paraffin embedding, rotary microtome sectioning, and routine H&E staining.',
        fileName: 'histopath-handbook-he.pdf',
        originalFileName: 'Histopathology_HE_Staining_Guide.pdf',
        tags: ['histopathology', 'notes', 'tissue-processing', 'microtome'],
        downloadCount: 420,
        viewCount: 1050,
      },
      {
        title: 'Immunology & Serological Techniques Exam Paper 2024',
        subjectIndex: 4, // Immunology
        docType: 'PYQ',
        semester: 5,
        year: 2024,
        session: 'Annual Exam',
        description: 'Previous year paper featuring ELISA principles, Widal test, VDRL, and western blotting questions.',
        fileName: 'immunology-pyq-2024.pdf',
        originalFileName: 'Immunology_Final_Exam_2024.pdf',
        tags: ['immunology', 'pyq', 'elisa', 'serology'],
        downloadCount: 198,
        viewCount: 670,
      },
      {
        title: 'Urine Microscopic Examination & Casts Identification Chart',
        subjectIndex: 5, // Clinical Pathology
        docType: 'NOTE',
        semester: 2,
        year: 2023,
        session: 'Practical Guide',
        description: 'Visual reference guide on urinary casts (hyaline, granular, RBC casts), crystals, and epithelial cells.',
        fileName: 'urinalysis-microscopic-guide.pdf',
        originalFileName: 'Urinalysis_Microscopy_Reference.pdf',
        tags: ['pathology', 'notes', 'urine', 'casts', 'crystals'],
        downloadCount: 630,
        viewCount: 1820,
      },
    ];

    for (const resItem of sampleResources) {
      const subject = createdSubjects[resItem.subjectIndex];
      const filePath = path.join(uploadsDir, resItem.fileName);

      // Write sample valid PDF file to disk
      const pdfBuffer = createDummyPdfBuffer(resItem.title);
      fs.writeFileSync(filePath, pdfBuffer);

      await Resource.create({
        title: resItem.title,
        subject: subject._id,
        docType: resItem.docType,
        semester: resItem.semester,
        year: resItem.year,
        session: resItem.session,
        description: resItem.description,
        fileUrl: `/uploads/pdfs/${resItem.fileName}`,
        fileName: resItem.fileName,
        originalFileName: resItem.originalFileName,
        fileSize: pdfBuffer.length,
        mimeType: 'application/pdf',
        tags: resItem.tags,
        downloadCount: resItem.downloadCount,
        viewCount: resItem.viewCount,
        status: 'published',
      });
    }

    console.log(`[MLTify Seed] ✅ Seeded ${sampleResources.length} sample PYQ & Note PDFs`);
    console.log('[MLTify Seed] Database seeding completed successfully! 🎉');
    process.exit(0);
  } catch (error) {
    if (error.message && error.message.includes('ECONNREFUSED')) {
      console.error('\n❌ [MLTify Error] Could not connect to MongoDB at 127.0.0.1:27017.');
      console.error('👉 MongoDB is either not started or not installed locally.\n');
      console.error('To fix this, choose one of the following:');
      console.error('1. If MongoDB is installed locally on Windows, start it:');
      console.error('   Run in Administrator Terminal: net start MongoDB');
      console.error('   Or run: mongod --dbpath "C:\\data\\db"\n');
      console.error('2. OR use a free cloud MongoDB Atlas cluster (Recommended):');
      console.error('   a) Go to https://www.mongodb.com/cloud/atlas and create a free M0 cluster');
      console.error('   b) Copy your connection string (e.g. mongodb+srv://username:password@cluster0.mongodb.net/mltify)');
      console.error('   c) Paste it into `multipoint-backend/.env`:');
      console.error('      MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.../mltify');
      console.error('   d) Re-run `npm run seed`\n');
    } else {
      console.error('[MLTify Seed] Error during seeding:', error);
    }
    process.exit(1);
  }
};

seed();

