const CSVFile = require('../models/mongoose');
const fs = require('fs');
const path = require('path');
const papa = require('papaparse');

// Render homepage
module.exports.homePage = async (req, res) => {
  try {
    let files = await CSVFile.find({});
    res.render('home', {
      title: 'CSV Upload | Home',
      files: files
    });
  } catch (err) {
    console.error('Error fetching files:', err);
    req.flash('error', 'Unable to fetch files');
    return res.redirect('back');
  }
};

// Create and parse CSV, store data in MongoDB
module.exports.uploadFile = (req, res) => {
  CSVFile.uploadedCSV(req, res, async function (err) {
    if (err) {
      req.flash('error', 'Error uploading file: ' + err.message);
      return res.redirect('back');
    }

    try {
      // Check if CSV with the same name already exists
      let csvFile = await CSVFile.findOne({ name: req.file.originalname });
      if (csvFile) {
        req.flash('error', 'CSV already exists! 😧');
        return res.redirect('back');
      }

      // Read and parse CSV using papaparse
      const CSVFileUP = req.file.path;
      const csvData = fs.readFileSync(CSVFileUP, 'utf8');

      const parsedFile = papa.parse(csvData, { header: false });

      // Check file type
      if (req.file && req.file.mimetype === 'text/csv') {
        // Inserting the parsed data directly into the database
        let csvFile = new CSVFile({
          name: req.file.originalname,
          data: parsedFile.data  // Save the parsed CSV data
        });

        await csvFile.save();

        req.flash('success', 'CSV uploaded successfully 🤙');
        return res.redirect('back');
      } else {
        req.flash('error', 'Only CSV files are allowed');
        return res.redirect('back');
      }
    } catch (err) {
      console.error('Error during file processing:', err);
      req.flash('error', 'Something went wrong ☹️');
      return res.render('servererror');
    } finally {
      // Delete the temp file after processing
      if (req.file && req.file.path) {
        fs.unlinkSync(req.file.path);
      }
    }
  });
};

// Display CSV Data
module.exports.displayCSV = async (req, res) => {
  try {
    let displayData = await CSVFile.findById(req.params.id);
    return res.render('table', {
      title: 'CSV Upload | Details',
      file: displayData.name,
      keys: displayData.data[0],  // Assuming first row contains headers
      results: displayData.data   // Display all rows from parsed CSV
    });
  } catch (err) {
    console.error('Error fetching CSV data:', err);
    req.flash('error', 'Unable to display CSV data');
    return res.redirect('back');
  }
};

// Delete CSV from MongoDB
module.exports.deleteCSV = async (req, res) => {
  try {
    await CSVFile.findByIdAndDelete(req.params.id);
    req.flash('success', 'CSV removed successfully 🤘');
    return res.redirect('back');
  } catch (err) {
    console.error('Error deleting CSV:', err);
    req.flash('error', 'Unable to delete CSV');
    return res.redirect('back');
  }
};
