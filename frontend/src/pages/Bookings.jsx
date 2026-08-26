import React, { useState, useEffect } from 'react';
import axios from '../utils/axios';
import * as XLSX from 'xlsx';
import { format, parseISO } from 'date-fns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Pagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Stack,
  Chip,
  Alert,
  Snackbar,
  CircularProgress,
  Tooltip,
  InputAdornment,
  Divider,
} from '@mui/material';
import {
  Edit,
  Delete,
  Download,
  Search,
  Refresh,
  Clear,
  Add,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

// 🔥 HOOK DEBOUNCE
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

const Bookings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [allTotal, setAllTotal] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [confirmedCount, setConfirmedCount] = useState(0);
  const [rejectedCount, setRejectedCount] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  
  const [filters, setFilters] = useState({ 
    search: '', 
    status: '', 
    date: null,
    startDate: null,
    endDate: null
  });
  
  // 🔥 STATE UNTUK SEARCH
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 500);
  
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [formData, setFormData] = useState({
    ruangan_id: '',
    booking_date: '',
    start_time: '',
    end_time: '',
    purpose: '',
    attendees: '',
  });
  const [rooms, setRooms] = useState([]);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null, name: '' });

  // Fetch rooms for dropdown
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('/ruangan/all', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setRooms(response.data || []);
      } catch (error) {
        console.error('Error fetching rooms:', error);
        showSnackbar('Gagal mengambil data ruangan', 'error');
      }
    };
    fetchRooms();
  }, []);

  // 🔥 UPDATE FILTER DARI SEARCH (dengan debounce)
  useEffect(() => {
    setFilters(prev => ({ ...prev, search: debouncedSearch }));
  }, [debouncedSearch]);

  // 🔥 DELAY UNTUK FILTER STATUS & TANGGAL
  useEffect(() => {
    const timer = setTimeout(() => {
      if (filters.status || filters.date || filters.startDate || filters.endDate) {
        fetchData();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [filters.status, filters.date, filters.startDate, filters.endDate]);

  // Fetch ALL data untuk count
  const fetchAllCount = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = {
        page: 1,
        limit: 9999,
        search: filters.search.trim(),
      };
      
      if (filters.status && filters.status !== 'all' && filters.status !== '') {
        params.status = filters.status;
      }
      
      if (filters.date) {
        params.date = format(filters.date, 'yyyy-MM-dd');
      }
      
      if (filters.startDate) {
        params.startDate = format(filters.startDate, 'yyyy-MM-dd');
      }
      
      if (filters.endDate) {
        params.endDate = format(filters.endDate, 'yyyy-MM-dd');
      }

      const response = await axios.get('/bookings', {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        const allData = response.data.data || [];
        setAllTotal(allData.length);
        
        const pending = allData.filter(item => item.status === 'pending').length;
        const confirmed = allData.filter(item => item.status === 'confirmed').length;
        const rejected = allData.filter(item => item.status === 'rejected').length;
        
        setPendingCount(pending);
        setConfirmedCount(confirmed);
        setRejectedCount(rejected);
      }
    } catch (error) {
      console.error('Error fetching all count:', error);
    }
  };

  // Fetch data dengan pagination
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      
      const params = { 
        page, 
        limit,
        search: filters.search.trim(),
      };
      
      if (filters.status && filters.status !== 'all' && filters.status !== '') {
        params.status = filters.status;
      }
      
      if (filters.date) {
        params.date = format(filters.date, 'yyyy-MM-dd');
      }
      
      if (filters.startDate) {
        params.startDate = format(filters.startDate, 'yyyy-MM-dd');
      }
      
      if (filters.endDate) {
        params.endDate = format(filters.endDate, 'yyyy-MM-dd');
      }
      
      const response = await axios.get('/bookings', {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        const bookingData = response.data.data || [];
        const totalData = response.data.pagination?.total || bookingData.length;
        
        setData(bookingData);
        setTotal(totalData);
        
        await fetchAllCount();
      } else {
        setError('Gagal mengambil data');
        showSnackbar('Gagal mengambil data booking', 'error');
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setError(error.message);
      showSnackbar('Gagal mengambil data: ' + (error.response?.data?.message || error.message), 'error');
    } finally {
      setLoading(false);
    }
  };

  // 🔥 HANYA 1 useEffect UNTUK FETCH DATA (hanya page & limit)
  useEffect(() => {
    fetchData();
  }, [page, limit]);

  // CRUD Operations
  const handleOpenAdd = () => {
    resetForm();
    setSelectedItem(null);
    setOpenDialog(true);
  };

  const handleOpenEdit = (item) => {
    setSelectedItem(item);
    setFormData({
      ruangan_id: item.ruangan_id,
      booking_date: item.booking_date,
      start_time: item.start_time,
      end_time: item.end_time,
      purpose: item.purpose || '',
      attendees: item.attendees || '',
    });
    setOpenDialog(true);
  };

  const handleOpenDelete = (id, name) => {
    setDeleteDialog({ open: true, id, name });
  };

  const handleSubmit = async () => {
    if (!formData.ruangan_id) {
      showSnackbar('Silakan pilih ruangan', 'error');
      return;
    }
    if (!formData.booking_date) {
      showSnackbar('Silakan pilih tanggal booking', 'error');
      return;
    }
    if (!formData.start_time) {
      showSnackbar('Silakan pilih jam mulai', 'error');
      return;
    }
    if (!formData.end_time) {
      showSnackbar('Silakan pilih jam selesai', 'error');
      return;
    }

    if (formData.start_time >= formData.end_time) {
      showSnackbar('Jam mulai harus lebih awal dari jam selesai', 'error');
      return;
    }

    setSubmitting(true);
    
    try {
      const token = localStorage.getItem('token');
      
      const submitData = {
        ruangan_id: parseInt(formData.ruangan_id),
        booking_date: formData.booking_date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        purpose: formData.purpose || '',
        attendees: parseInt(formData.attendees) || 0,
      };

      let response;
      if (selectedItem) {
        response = await axios.put(`/bookings/${selectedItem.id}`, submitData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        response = await axios.post('/bookings', submitData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      
      if (response.data.success) {
        showSnackbar(
          selectedItem ? 'Booking berhasil diupdate' : 'Booking berhasil ditambahkan',
          'success'
        );
        setOpenDialog(false);
        resetForm();
        fetchData();
      } else {
        showSnackbar(response.data.message || 'Gagal menyimpan data', 'error');
      }
    } catch (error) {
      console.error('Submit error:', error);
      showSnackbar(error.response?.data?.message || 'Gagal menyimpan data', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    const { id } = deleteDialog;
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(`/bookings/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        showSnackbar('Booking berhasil dihapus', 'success');
        setDeleteDialog({ open: false, id: null, name: '' });
        fetchData();
      } else {
        showSnackbar(response.data.message || 'Gagal menghapus data', 'error');
      }
    } catch (error) {
      console.error('Delete error:', error);
      showSnackbar('Gagal menghapus data', 'error');
    }
  };

  const exportToExcel = () => {
    if (data.length === 0) {
      showSnackbar('Tidak ada data untuk diexport', 'warning');
      return;
    }
    
    const exportData = data.map((item) => ({
      'Ruangan': item.ruangan_name,
      'Tanggal': item.booking_date,
      'Jam Mulai': item.start_time,
      'Jam Selesai': item.end_time,
      'Tujuan': item.purpose || '-',
      'Jumlah Peserta': item.attendees || 0,
      'Status': item.status === 'pending' ? 'Menunggu' : 
               item.status === 'confirmed' ? 'Disetujui' : 
               item.status === 'rejected' ? 'Ditolak' : item.status,
      'Diminta Oleh': item.user_name,
      'Tanggal Dibuat': new Date(item.created_at).toLocaleDateString('id-ID'),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bookings');
    
    const colWidths = [
      { wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 12 },
      { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 15 }
    ];
    ws['!cols'] = colWidths;
    
    XLSX.writeFile(wb, `bookings_${new Date().toISOString().split('T')[0]}.xlsx`);
    showSnackbar('Excel berhasil diexport', 'success');
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const resetForm = () => {
    setFormData({
      ruangan_id: '',
      booking_date: '',
      start_time: '',
      end_time: '',
      purpose: '',
      attendees: '',
    });
    setSelectedItem(null);
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setFilters({ search: '', status: '', date: null, startDate: null, endDate: null });
    setPage(1);
  };

  const getStatusChip = (status) => {
    const config = {
      pending: { label: 'Menunggu', color: 'warning' },
      confirmed: { label: 'Disetujui', color: 'success' },
      rejected: { label: 'Ditolak', color: 'error' },
      cancelled: { label: 'Dibatalkan', color: 'default' },
    };
    const { label, color } = config[status] || { label: status, color: 'default' };
    return <Chip label={label} color={color} size="small" />;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ py: 4 }}>
        <Alert severity="error">
          Error: {error}
        </Alert>
        <Button onClick={fetchData} variant="contained" sx={{ mt: 2 }}>
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" fontWeight="bold">
          Manajemen Booking
        </Typography>
        <Stack direction="row" spacing={2} flexWrap="wrap">
          <Button 
            variant="outlined" 
            startIcon={<Refresh />} 
            onClick={() => fetchData()}
          >
            Refresh
          </Button>
          <Button 
            variant="outlined" 
            startIcon={<Download />} 
            onClick={exportToExcel}
            disabled={data.length === 0}
          >
            Export Excel
          </Button>
          <Button 
            variant="contained" 
            startIcon={<Add />} 
            onClick={handleOpenAdd}
            sx={{ 
              background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
              '&:hover': {
                background: 'linear-gradient(45deg, #1565c0 30%, #1976d2 90%)',
              }
            }}
          >
            Tambah Booking
          </Button>
        </Stack>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, borderLeft: '4px solid #1976d2', background: '#f5f9ff' }}>
            <Typography variant="body2" color="textSecondary">Total Data</Typography>
            <Typography variant="h5" fontWeight="bold" color="#1976d2">
              {allTotal}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {data.length} data ditampilkan
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, borderLeft: '4px solid #ff9800', background: '#fff8f0' }}>
            <Typography variant="body2" color="textSecondary">Menunggu</Typography>
            <Typography variant="h5" fontWeight="bold" color="warning.main">
              {pendingCount}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {allTotal > 0 ? Math.round((pendingCount / allTotal) * 100) : 0}% dari total
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, borderLeft: '4px solid #4caf50', background: '#f0fff4' }}>
            <Typography variant="body2" color="textSecondary">Disetujui</Typography>
            <Typography variant="h5" fontWeight="bold" color="success.main">
              {confirmedCount}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {allTotal > 0 ? Math.round((confirmedCount / allTotal) * 100) : 0}% dari total
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, borderLeft: '4px solid #f44336', background: '#fff5f5' }}>
            <Typography variant="body2" color="textSecondary">Ditolak</Typography>
            <Typography variant="h5" fontWeight="bold" color="error.main">
              {rejectedCount}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {allTotal > 0 ? Math.round((rejectedCount / allTotal) * 100) : 0}% dari total
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              size="small"
              label="Cari Booking"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setPage(1);
              }}
              placeholder="Cari ruangan atau tujuan..."
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status}
                onChange={(e) => {
                  setFilters({ ...filters, status: e.target.value });
                  setPage(1);
                }}
                label="Status"
              >
                <MenuItem value="">Semua</MenuItem>
                <MenuItem value="pending">Menunggu</MenuItem>
                <MenuItem value="confirmed">Disetujui</MenuItem>
                <MenuItem value="rejected">Ditolak</MenuItem>
                <MenuItem value="cancelled">Dibatalkan</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <DatePicker
              label="Tanggal"
              value={filters.date}
              onChange={(newDate) => {
                setFilters({ ...filters, date: newDate, startDate: null, endDate: null });
                setPage(1);
              }}
              slotProps={{ textField: { size: 'small', fullWidth: true } }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <DatePicker
              label="Dari Tanggal"
              value={filters.startDate}
              onChange={(newDate) => {
                setFilters({ ...filters, startDate: newDate, date: null });
                setPage(1);
              }}
              slotProps={{ textField: { size: 'small', fullWidth: true } }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <DatePicker
              label="Sampai Tanggal"
              value={filters.endDate}
              onChange={(newDate) => {
                setFilters({ ...filters, endDate: newDate, date: null });
                setPage(1);
              }}
              slotProps={{ textField: { size: 'small', fullWidth: true } }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={1}>
            <Button 
              fullWidth 
              variant="outlined" 
              onClick={handleClearFilters}
              startIcon={<Clear />}
              size="small"
            >
              Reset
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead sx={{ bgcolor: 'grey.50' }}>
            <TableRow>
              <TableCell>No</TableCell>
              <TableCell>Ruangan</TableCell>
              <TableCell>Tanggal</TableCell>
              <TableCell>Jam</TableCell>
              <TableCell>Tujuan</TableCell>
              <TableCell>Peserta</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Diminta Oleh</TableCell>
              <TableCell align="center">Aksi</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                  <Typography color="textSecondary">
                    Belum ada data booking
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              data.map((item, index) => (
                <TableRow key={item.id} hover>
                  <TableCell>{(page - 1) * limit + index + 1}</TableCell>
                  <TableCell>
                    <Typography fontWeight="500">{item.ruangan_name}</Typography>
                  </TableCell>
                  <TableCell>{item.booking_date}</TableCell>
                  <TableCell>{item.start_time} - {item.end_time}</TableCell>
                  <TableCell>{item.purpose || '-'}</TableCell>
                  <TableCell>{item.attendees || 0}</TableCell>
                  <TableCell>{getStatusChip(item.status)}</TableCell>
                  <TableCell>{item.user_name}</TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={1} justifyContent="center">
                      <Tooltip title="Edit">
                        <IconButton 
                          size="small" 
                          color="primary" 
                          onClick={() => handleOpenEdit(item)}
                        >
                          <Edit />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Hapus">
                        <IconButton 
                          size="small" 
                          color="error" 
                          onClick={() => handleOpenDelete(item.id, item.ruangan_name)}
                        >
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="body2" color="textSecondary">
          Menampilkan {data.length} dari {allTotal} booking
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 80 }}>
            <Select 
              value={limit} 
              onChange={(e) => {
                setLimit(e.target.value);
                setPage(1);
              }}
            >
              {[10, 25, 50, 100].map((v) => (
                <MenuItem key={v} value={v}>{v}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Pagination
            count={Math.ceil((allTotal) / limit)}
            page={page}
            onChange={(e, v) => setPage(v)}
            color="primary"
            showFirstButton
            showLastButton
          />
        </Stack>
      </Box>

      {/* Dialog Add/Edit */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Typography variant="h6" fontWeight="bold">
            {selectedItem ? 'Edit Booking' : 'Tambah Booking Baru'}
          </Typography>
        </DialogTitle>
        <Divider />
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Ruangan *</InputLabel>
                  <Select
                    value={formData.ruangan_id}
                    onChange={(e) => setFormData({ ...formData, ruangan_id: e.target.value })}
                    label="Ruangan *"
                  >
                    <MenuItem value="">Pilih Ruangan</MenuItem>
                    {rooms.map((r) => (
                      <MenuItem key={r.id} value={r.id}>
                        {r.name} (Kapasitas: {r.capacity})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <DatePicker
                  label="Tanggal Booking *"
                  value={formData.booking_date ? parseISO(formData.booking_date) : null}
                  onChange={(newDate) => setFormData({ 
                    ...formData, 
                    booking_date: newDate ? format(newDate, 'yyyy-MM-dd') : '' 
                  })}
                  slotProps={{ 
                    textField: { 
                      fullWidth: true, 
                      required: true
                    } 
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Jam Mulai *"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Jam Selesai *"
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Tujuan"
                  multiline
                  rows={3}
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  placeholder="Deskripsikan tujuan booking..."
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Jumlah Peserta"
                  type="number"
                  value={formData.attendees}
                  onChange={(e) => setFormData({ ...formData, attendees: e.target.value })}
                  inputProps={{ min: 1 }}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button 
            onClick={() => {
              setOpenDialog(false);
              resetForm();
            }} 
            variant="outlined"
          >
            Batal
          </Button>
          <Button 
            variant="contained" 
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Menyimpan...' : (selectedItem ? 'Update' : 'Simpan')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Delete */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, id: null, name: '' })}>
        <DialogTitle>Konfirmasi Hapus</DialogTitle>
        <DialogContent>
          <Typography>
            Apakah Anda yakin ingin menghapus booking untuk ruangan <strong>{deleteDialog.name}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, id: null, name: '' })}>Batal</Button>
          <Button variant="contained" color="error" onClick={handleConfirmDelete}>
            Hapus
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert 
          severity={snackbar.severity} 
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Bookings;