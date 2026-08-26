import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Pagination,
  Select,
  MenuItem,
  FormControl,
  Box,
  Typography,
  Stack,
  CircularProgress,
} from '@mui/material';

const PaginationTable = ({
  columns,
  data,
  loading,
  pagination,
  onPageChange,
  onLimitChange,
  renderRow,
}) => {
  const { page, limit, total, totalPages } = pagination;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
      <TableContainer>
        <Table>
          <TableHead sx={{ bgcolor: 'grey.50' }}>
            <TableRow>
              {columns.map((col, index) => (
                <TableCell
                  key={index}
                  align={col.align || 'left'}
                  sx={{ fontWeight: 600 }}
                >
                  {col.header}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {data?.length > 0 ? (
              data.map((item, index) => renderRow(item, index))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} align="center" sx={{ py: 8 }}>
                  <Typography color="textSecondary">No data available</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="body2" color="textSecondary">
          Showing {data?.length || 0} of {total} entries
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 80 }}>
            <Select
              value={limit}
              onChange={(e) => onLimitChange(e.target.value)}
            >
              {[10, 25, 50, 100].map((value) => (
                <MenuItem key={value} value={value}>
                  {value}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(e, value) => onPageChange(value)}
            color="primary"
            showFirstButton
            showLastButton
          />
        </Stack>
      </Box>
    </Paper>
  );
};

export default PaginationTable;