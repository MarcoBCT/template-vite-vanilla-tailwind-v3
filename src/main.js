import './index.css'

import jsPDF from 'jspdf';
import Papa from 'papaparse';
import JsBarcode from 'jsbarcode';

const fileUploadEAN13 = document.getElementById('fileUploadEAN13');
const fileUploadCode128 = document.getElementById('fileUploadCode128');
const errorElementEAN = document.getElementById('file_input_errors_ean13');
const errorElementCode = document.getElementById('file_input_errors_code128');

fileUploadEAN13.addEventListener('change', (e) => {
  const file = fileUploadEAN13.files[0];

  if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
    const fileReader = new FileReader();

    fileReader.onload = function (event) {
      const content = event.target.result;
      parseCSV(content, 'EAN13');
    };

    fileReader.readAsText(file);
  } else {
    errorElementEAN.innerHTML = 'The uploaded file must be a CSV.';
  }
});

fileUploadCode128.addEventListener('change', (e) => {
  const file = fileUploadCode128.files[0];

  if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
    const fileReader = new FileReader();

    fileReader.onload = function (event) {
      const content = event.target.result;
      parseCSV(content, 'CODE128');
    };

    fileReader.readAsText(file);
  } else {
    errorElementCode.innerHTML = 'The uploaded file must be a CSV.';
  }
});

function parseCSV(content, barcodeFormat) {
  Papa.parse(content, {
    skipEmptyLines: 'greedy',
    complete: function (results) {
      const errors = validateCSVData(results.data);

      if (errors.length === 0) {
        // If there are no errors, create the PDF
        results.data.shift();
        createPDF(results.data, barcodeFormat);
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

const generateBarcodeImage = (barcodeValue, barcodeHeight, barcodeFormat) => {
  const canvas = document.createElement('canvas');
  JsBarcode(canvas, barcodeValue, {
    format: barcodeFormat,
    width: 2,
    height: barcodeHeight,
    fontSize: 24,
    flat: true,
    displayValue: false
  });
  return canvas.toDataURL('image/png');
};

const createPDF = (data, barcodeFormat = 'EAN13') => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [60, 40]
  });

  const xMargin = 5;
  const yMargin = 10;
  const barcodeWidth = 50;
  const barcodeHeight = 20;
  const fontSize = 11;
  const pageHeight = doc.internal.pageSize.getHeight();

  data.forEach((row, index) => {
    if (index !== 0) {
      doc.addPage();
    }

    const productName = row[0]; // Assuming the product name is in the second column of each row
    const barcodeValue = row[1]; // Assuming the barcode value is in the first column of each row

    const x = xMargin;
    const y = yMargin;

    // const canvas = document.createElement('canvas');
    const imageData = generateBarcodeImage(barcodeValue, barcodeHeight, barcodeFormat);
    // JsBarcode(canvas, barcodeValue, {
    //   format: 'EAN13',
    //   width: 2,
    //   height: barcodeHeight,
    //   fontSize: 24,
    //   flat: true,
    //   displayValue: false
    // });
    // const imageData = canvas.toDataURL('image/png');
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