import './index.css'

import jsPDF from 'jspdf';
import Papa from 'papaparse';
import JsBarcode from 'jsbarcode';

const fileUpload = document.getElementById('fileUpload');
const errorElement = document.getElementById('file_input_errors');

fileUpload.addEventListener('change', (e) => {
  const file = fileUpload.files[0];

  if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
    const fileReader = new FileReader();

    fileReader.onload = function (event) {
      const content = event.target.result;
      parseCSV(content);
    };

    fileReader.readAsText(file);
  } else {
    errorElement.innerHTML = 'The uploaded file must be a CSV.';
  }

});

function parseCSV(content) {
  Papa.parse(content, {
    skipEmptyLines: 'greedy',
    complete: function (results) {
      const errors = validateCSVData(results.data);

      if (errors.length === 0) {
        // If there are no errors, create the PDF
        results.data.shift();
        createPDF(results.data);
      } else {
        errorElement.innerHTML = errors.join('<br>');
      }

    }
  });
}

const validateCSVData = data => {
  const errors = [];

  // Ensure that the first row exists and has the correct headers
  if (!data[0] || data[0][0] !== 'Name' || data[0][1] !== 'Barcode') {
    errors.push('Invalid header row. Expected headers: "Name" and "Barcode".');
  }

  // Ensure there are more than one row of data (excluding the header row)
  if (data.length <= 1) {
    errors.push('The CSV must contain at least one row of data (excluding the header row).');
  }

  return errors;
}


const createPDF = data => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [60, 40]
  });

  const xMargin = 5;
  const yMargin = 10;
  const barcodeWidth = 50;
  const barcodeHeight = 20;
  const fontSize = 12;
  const pageHeight = doc.internal.pageSize.getHeight();

  data.forEach((row, index) => {
    if (index !== 0) {
      doc.addPage();
    }

    const productName = row[0]; // Assuming the product name is in the second column of each row
    const barcodeValue = row[1]; // Assuming the barcode value is in the first column of each row


    const x = xMargin;
    const y = yMargin;

    const canvas = document.createElement('canvas');
    JsBarcode(canvas, barcodeValue, {
      format: 'EAN13',
      width: 2,
      height: barcodeHeight,
      fontSize: 24,
      flat: true,
      displayValue: false
    });

    const imageData = canvas.toDataURL('image/png');
    doc.addImage(imageData, 'PNG', x, y, barcodeWidth, barcodeHeight);

    // Add the barcode value underneath the barcode
    doc.setFontSize(fontSize);
    // Calculate the width of the text
    const textWidth = doc.getTextWidth(productName);
    const barcodeNumberWidth = doc.getTextWidth(barcodeValue);
    // Calculate the centered X coordinate
    const centerTextValue = x + (barcodeWidth - textWidth) / 2;
    const centerBarcodeValue = x + (barcodeWidth - barcodeNumberWidth) / 2;

    doc.text(productName, centerTextValue, y + 2);
    doc.text(barcodeValue, centerBarcodeValue, y + barcodeHeight);

    if (index !== data.length - 1 && (y + barcodeHeight + yMargin) > pageHeight) {
      doc.addPage();
    }
  });

  doc.save('output.pdf');
}