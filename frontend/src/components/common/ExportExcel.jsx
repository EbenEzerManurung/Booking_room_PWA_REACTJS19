import React from 'react';
import { Button } from '@mui/material';
import { Download } from '@mui/icons-material';
import * as XLSX from 'xlsx';

const ExportExcel = ({ data, filename, columns, label = 'Export Excel', ...props }) => {
  const handleExport = () => {
    if (!data || data.length === 0) {
      alert('No data to export');
      return;
    }

    // Map data to export format
    const exportData = data.map(item => {
      const row = {};
      columns.forEach(col => {
        let value = item[col.key];
        if (typeof value === 'boolean') {
          value = value ? 'Active' : 'Inactive';
        }
        if (value instanceof Date) {
          value = value.toLocaleDateString();
        }
        row[col.header] = value || '-';
      });
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

    // Auto column widths
    const colWidths = columns.map(col => ({
      wch: Math.max(col.header.length, 15)
    }));
    ws['!cols'] = colWidths;

    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <Button
      variant="contained"
      startIcon={<Download />}
      onClick={handleExport}
      {...props}
    >
      {label}
    </Button>
  );
};

export default ExportExcel;