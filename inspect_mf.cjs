const XLSX = require("xlsx");
const path = require("path");

const filePath = path.join(__dirname, "Mutual_Funds_8893418831_17-02-2026_17-02-2026.xlsx");
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

console.log("Sheet Name:", sheetName);
console.log("Rows 0-50:");
data.slice(0, 50).forEach((row, i) => {
    if (row && row.length > 0) {
        console.log(`Row ${i}:`, row);
    }
});
