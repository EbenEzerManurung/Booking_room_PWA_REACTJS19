import React, { useState, useEffect } from 'react';
import axios from '../utils/axios';
import * as XLSX from 'xlsx';
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
  Switch,
  FormControlLabel,
  Alert,
  Snackbar,
  CircularProgress,
  Tooltip,
  InputAdornment,
  Card,
  CardContent,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Download,
  Search,
  Refresh,
  MeetingRoom,
  CheckCircle,
  Cancel,
  Clear,
  TrendingUp,
  TrendingDown,
  EventNote,
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

const Ruangan = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [allTotal, setAllTotal] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [inactiveCount, setInactiveCount] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  
  // 🔥 STATE UNTUK SEARCH (dengan debounce)
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 500);
  
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [formData, setFormData] = useState({
    name: '',
    capacity: '',
    location: '',
    facilities: '',
    is_active: true,
  });

  // Fetch ALL data untuk count (tanpa pagination)
  const fetchAllCount = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/ruangan', {
        params: { 
          page: 1, 
          limit: 9999,
          search: debouncedSearch.trim()
        },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('📊 ALL DATA FOR COUNT:', response.data);
      
      if (response.data.success) {
        const allData = response.data.data || [];
        setAllTotal(allData.length);
        
        // 🔥 PERBAIKAN: Cek status dengan benar
        // is_active bisa berupa boolean (true/false) atau number (1/0) atau string ('true'/'false')
        const active = allData.filter(item => {
          const status = item.is_active;
          // Cek berbagai kemungkinan format status
          return status === true || 
                 status === 1 || 
                 status === '1' || 
                 status === 'true' ||
                 status === 'TRUE';
        }).length;
        
        const inactive = allData.length - active;
        
        console.log('📊 Active:', active, 'Inactive:', inactive, 'Total:', allData.length);
        
        setActiveCount(active);
        setInactiveCount(inactive);
      }
    } catch (error) {
      console.error('Error fetching all count:', error);
    }
  };

  // Fetch data dengan pagination
  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      const response = await axios.get('/ruangan', {
        params: { 
          page, 
          limit, 
          search: debouncedSearch.trim()
        },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('📊 PAGINATED DATA:', response.data);
      
      if (response.data.success) {
        setData(response.data.data || []);
        setTotal(response.data.pagination?.total || 0);
        
        // 🔥 Panggil fetchAllCount untuk mendapatkan total semua data
        await fetchAllCount();
      }
    } catch (error) {
      console.error('Error:', error);
      showSnackbar('Gagal mengambil data', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 🔥 Effect untuk fetch data dengan debounce
  useEffect(() => {
    fetchData();
  }, [page, limit, debouncedSearch]);

  // CRUD Operations
  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem('token');
      const url = selectedItem ? `/ruangan/${selectedItem.id}` : '/ruangan';
      const method = selectedItem ? 'put' : 'post';
      
      const response = await axios[method](url, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        showSnackbar(selectedItem ? 'Ruangan berhasil diupdate' : 'Ruangan berhasil ditambahkan', 'success');
        setOpenDialog(false);
        resetForm();
        fetchData();
      }
    } catch (error) {
      showSnackbar(error.response?.data?.message || 'Gagal menyimpan data', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Yakin ingin menghapus ruangan ini?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/ruangan/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showSnackbar('Ruangan berhasil dihapus', 'success');
      fetchData();
    } catch (error) {
      showSnackbar('Gagal menghapus data', 'error');
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`/ruangan/${id}/toggle-status`, 
        { is_active: !currentStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showSnackbar(`Ruangan ${!currentStatus ? 'diaktifkan' : 'dinonaktifkan'}`, 'success');
      fetchData();
    } catch (error) {
      showSnackbar('Gagal mengubah status', 'error');
    }
  };

  // Export Excel
  const exportToExcel = () => {
    const exportData = data.map((item) => ({
      'Nama': item.name,
      'Kapasitas': item.capacity,
      'Lokasi': item.location || '-',
      'Fasilitas': item.facilities || '-',
      'Status': item.is_active ? 'Aktif' : 'Tidak Aktif',
      'Dibuat': new Date(item.created_at).toLocaleDateString('id-ID'),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ruangan');
    
    const colWidths = [
      { wch: 20 }, { wch: 15 }, { wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 15 }
    ];
    ws['!cols'] = colWidths;
    
    XLSX.writeFile(wb, `ruangan_${new Date().toISOString().split('T')[0]}.xlsx`);
    showSnackbar('Excel berhasil diexport', 'success');
  };

  // Helper functions
  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const resetForm = () => {
    setFormData({ name: '', capacity: '', location: '', facilities: '', is_active: true });
    setSelectedItem(null);
  };

  const handleEdit = (item) => {
    setSelectedItem(item);
    setFormData({
      name: item.name,
      capacity: item.capacity,
      location: item.location || '',
      facilities: item.facilities || '',
      is_active: item.is_active,
    });
    setOpenDialog(true);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setPage(1);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Hitung kapasitas total
  const totalCapacity = data.reduce((sum, item) => sum + (parseInt(item.capacity) || 0), 0);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" fontWeight="bold">
          Kelola Ruangan
        </Typography>
        <Stack direction="row" spacing={2} flexWrap="wrap">
          <Button variant="outlined" startIcon={<Refresh />} onClick={() => fetchData()}>
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
          <Button variant="contained" startIcon={<Add />} onClick={() => setOpenDialog(true)}>
            Tambah Ruangan
          </Button>
        </Stack>
      </Box>

      {/* 🔥 SUMMARY CARDS */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, borderLeft: '4px solid #1976d2', background: '#f5f9ff' }}>
            <Typography variant="body2" color="textSecondary">
              <EventNote sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
              Total Ruangan
            </Typography>
            <Typography variant="h5" fontWeight="bold" color="#1976d2">
              {allTotal}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {data.length} data ditampilkan
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, borderLeft: '4px solid #4caf50', background: '#f0fff4' }}>
            <Typography variant="body2" color="textSecondary">
              <CheckCircle sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
              Aktif
            </Typography>
            <Typography variant="h5" fontWeight="bold" color="#4caf50">
              {activeCount}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {allTotal > 0 ? Math.round((activeCount / allTotal) * 100) : 0}% dari total
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, borderLeft: '4px solid #f44336', background: '#fff5f5' }}>
            <Typography variant="body2" color="textSecondary">
              <Cancel sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
              Tidak Aktif
            </Typography>
            <Typography variant="h5" fontWeight="bold" color="#f44336">
              {inactiveCount}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {allTotal > 0 ? Math.round((inactiveCount / allTotal) * 100) : 0}% dari total
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, borderLeft: '4px solid #ff9800', background: '#fff8f0' }}>
            <Typography variant="body2" color="textSecondary">
              <MeetingRoom sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
              Kapasitas Total
            </Typography>
            <Typography variant="h5" fontWeight="bold" color="#ff9800">
              {totalCapacity}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {data.length} ruangan terhitung
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Filter - FULL TEXT SEARCH */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={8}>
            <TextField
              fullWidth
              size="small"
              label="Cari Ruangan"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Ketik apapun untuk mencari (nama, lokasi, fasilitas)..."
              helperText={searchInput ? `🔍 Mencari: "${searchInput}"` : 'Ketik apapun untuk mencari'}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
                endAdornment: searchInput && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={handleClearSearch}>
                      <Clear />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Button 
              fullWidth 
              variant="outlined" 
              onClick={handleClearSearch}
              startIcon={<Refresh />}
            >
              Reset Filter
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
              <TableCell>Nama</TableCell>
              <TableCell>Kapasitas</TableCell>
              <TableCell>Lokasi</TableCell>
              <TableCell>Fasilitas</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">Aksi</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Typography color="textSecondary">
                    {searchInput ? `Tidak ada hasil untuk "${searchInput}"` : 'Belum ada data ruangan'}
                  </Typography>
                  {searchInput && (
                    <Button size="small" onClick={handleClearSearch} sx={{ mt: 1 }}>
                      Hapus filter
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              data.map((item, index) => {
                // 🔥 Cek status dengan benar untuk tampilan
                const isActive = item.is_active === true || 
                                 item.is_active === 1 || 
                                 item.is_active === '1' || 
                                 item.is_active === 'true' ||
                                 item.is_active === 'TRUE';
                
                return (
                  <TableRow key={item.id} hover>
                    <TableCell>{(page - 1) * limit + index + 1}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {item.name}
                      </Typography>
                    </TableCell>
                    <TableCell>{item.capacity} orang</TableCell>
                    <TableCell>{item.location || '-'}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {item.facilities?.split(',').map((fac, i) => (
                          <Chip key={i} label={fac.trim()} size="small" variant="outlined" />
                        ))}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={isActive ? 'Aktif' : 'Tidak Aktif'}
                        color={isActive ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={1} justifyContent="center">
                        <Tooltip title="Edit">
                          <IconButton size="small" color="primary" onClick={() => handleEdit(item)}>
                            <Edit />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={isActive ? 'Nonaktifkan' : 'Aktifkan'}>
                          <IconButton
                            size="small"
                            color={isActive ? 'warning' : 'success'}
                            onClick={() => handleToggleStatus(item.id, isActive)}
                          >
                            {isActive ? <Cancel /> : <CheckCircle />}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Hapus">
                          <IconButton 
                            size="small" 
                            color="error" 
                            onClick={() => handleDelete(item.id)}
                          >
                            <Delete />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="body2" color="textSecondary">
          Menampilkan {data.length} dari {allTotal} ruangan
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
            count={Math.ceil(allTotal / limit)}
            page={page}
            onChange={(e, v) => setPage(v)}
            color="primary"
            showFirstButton
            showLastButton
          />
        </Stack>
      </Box>

      {/* Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Typography variant="h6" fontWeight="bold">
            {selectedItem ? 'Edit Ruangan' : 'Tambah Ruangan Baru'}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Nama Ruangan"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <MeetingRoom />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Kapasitas (orang)"
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  required
                  inputProps={{ min: 1 }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Lokasi"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Contoh: Lantai 2, Gedung A"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Fasilitas"
                  value={formData.facilities}
                  onChange={(e) => setFormData({ ...formData, facilities: e.target.value })}
                  placeholder="Contoh: Projector, Whiteboard, AC"
                  helperText="Pisahkan dengan koma"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.is_active === true || formData.is_active === 1 || formData.is_active === '1' || formData.is_active === 'true'}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      color="primary"
                    />
                  }
                  label="Aktif"
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpenDialog(false)} variant="outlined">
            Batal
          </Button>
          <Button 
            variant="contained" 
            onClick={handleSubmit}
            disabled={!formData.name || !formData.capacity}
          >
            {selectedItem ? 'Update' : 'Simpan'}
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
          variant="filled"
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          sx={{ minWidth: 300 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Ruangan;