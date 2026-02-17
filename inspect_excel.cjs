const XLSX = require('xlsx');

const filePath = 'd:/Shivam/SpendWise/Stocks_Holdings_Statement_8893418831_16-02-2026.xlsx';

try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    data.slice(0, 15).forEach((row, i) => {
        console.log(`Row ${i}:`, JSON.stringify(row));
    });
} catch (error) {
    console.error("Error reading file:", error);
}
