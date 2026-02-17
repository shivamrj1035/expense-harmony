const XLSX = require('xlsx');
const path = require('path');

const filePath = 'd:\\Shivam\\SpendWise\\Mutual_Funds_8893418831_17-02-2026_17-02-2026.xlsx';
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

for (let i = 0; i < 50; i++) {
    const row = data[i];
    if (row && row.length > 0) {
        console.log(`Row ${i}:`, JSON.stringify(row).slice(0, 200));
    }
}
