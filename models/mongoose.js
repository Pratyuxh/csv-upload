const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const csvParser = require('csv-parser');  // Library to parse CSV

// Define the Schema for CSV data storage
const csvSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  data: {
    type: Array,  // Array of objects to store parsed CSV data
    required: true,
  }
}, {
  timestamps: true
});

// Directory path for CSV uploads
const uploadDir = path.join(__dirname, '..', 'uploads', 'csv');

// Ensure that the directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Make sure the upload directory exists before saving
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix);
  }
});

// Multer storage (you can keep this as a temporary storage, or remove if unnecessary)
// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, path.join(__dirname, '..', '/uploads/csv'));  // Temp directory for file upload before parsing
//   },
//   filename: function (req, file, cb) {
//     const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
//     cb(null, file.fieldname + '-' + uniqueSuffix);
//   }
// });

// Static functions for multer upload
csvSchema.statics.uploadedCSV = multer({ storage: storage, limits: { fileSize: 1 * 1024 * 1024 } }).single('csv');

// Function to parse CSV and store in MongoDB
csvSchema.statics.saveCSVDataToDB = async function (req, res) {
  if (!req.file) {
    return res.status(400).send('No file uploaded');
  }

  const csvData = [];
  const filePath = req.file.path;

  // Read and parse the CSV file
  fs.createReadStream(filePath)
    .pipe(csvParser())
    .on('data', (row) => {
      csvData.push(row);  // Push each row into csvData array
    })
    .on('end', async () => {
      // After CSV is fully parsed, save data to MongoDB
      const csvRecord = new this({
        name: req.file.originalname,
        data: csvData
      });

      try {
        await csvRecord.save();  // Save parsed data in MongoDB
        res.status(200).send('File successfully processed and data stored in MongoDB');
      } catch (err) {
        res.status(500).send('Error storing data in MongoDB: ' + err.message);
      }

      // Optionally, delete the temp file after parsing
      fs.unlinkSync(filePath);
    });
};

// Export the CSVFile model
const CSVFile = mongoose.model('CSVFile', csvSchema);
module.exports = CSVFile;
