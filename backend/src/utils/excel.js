const XLSX = require('xlsx');

const exportToExcel = (data, columns, sheetName = 'Sheet1') => {
    // Map data to excel format
    const excelData = data.map(item => {
        const row = {};
        columns.forEach(col => {
            let value = item[col.key];
            if (typeof value === 'boolean') {
                value = value ? 'Active' : 'Inactive';
            }
            if (value instanceof Date) {
                value = value.toLocaleDateString();
            }
            if (value === null || value === undefined) {
                value = '-';
            }
            row[col.header] = value;
        });
        return row;
    });

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    // Auto-column width
    const colWidths = columns.map(col => ({
        wch: Math.max(col.header.length, 15)
    }));
    ws['!cols'] = colWidths;

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
};

module.exports = { exportToExcel };