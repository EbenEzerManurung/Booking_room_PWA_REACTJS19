import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '../utils/axios';
import * as XLSX from 'xlsx';
import { format, parseISO } from 'date-fns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import QRCode from 'qrcode.react';
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
  Chip,
  CircularProgress,
  Tooltip,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Stack,
  Alert,
  Snackbar,
  Divider,
  Card,
  CardContent,
} from '@mui/material';
import {
  Refresh,
  Search,
  Clear,
  Download,
  CheckCircle,
  Cancel,
  QrCode,
  Print,
  Visibility,
  Edit,
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

const Approval = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    date: null,
    startDate: null,
    endDate: null,
  });
  
  // 🔥 STATE UNTUK SEARCH
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 500);
  
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [openQRDialog, setOpenQRDialog] = useState(false);
  const [openDetailDialog, setOpenDetailDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editForm, setEditForm] = useState({
    booking_date: '',
    start_time: '',
    end_time: '',
    purpose: '',
    attendees: '',
    status: '',
  });
  const [rooms, setRooms] = useState([]);
  
  // State untuk total semua data (tanpa pagination)
  const [allTotal, setAllTotal] = useState(0);
  const [allPending, setAllPending] = useState(0);
  const [allConfirmed, setAllConfirmed] = useState(0);
  const [allRejected, setAllRejected] = useState(0);

  // Check if user is Super Admin or GA
  const isAuthorized = user?.role_name?.toLowerCase() === 'superadmin' || 
                       user?.role_name?.toLowerCase() === 'ga';

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
        refetch();
        fetchAllData();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [filters.status, filters.date, filters.startDate, filters.endDate]);

  // Fetch ALL data for counting (tanpa pagination)
  const fetchAllData = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = {
        page: 1,
        limit: 9999,
        search: filters.search?.trim() || '',
      };

      if (filters.status && filters.status !== '') {
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

      console.log('📊 ALL DATA:', response.data);

      if (response.data.success) {
        const allData = response.data.data || [];
        setAllTotal(allData.length);
        
        const pending = allData.filter(item => item.status === 'pending').length;
        const confirmed = allData.filter(item => item.status === 'confirmed').length;
        const rejected = allData.filter(item => item.status === 'rejected').length;
        
        setAllPending(pending);
        setAllConfirmed(confirmed);
        setAllRejected(rejected);
      }
    } catch (error) {
      console.error('Error fetching all data:', error);
    }
  };

  // Fetch approvals with pagination
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['approvals', page, limit, filters],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const params = {
        page,
        limit,
        search: filters.search?.trim() || '',
      };

      if (filters.status && filters.status !== '') {
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
      
      // Setelah fetch data pagination, fetch all data untuk count
      fetchAllData();
      
      return response.data;
    },
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (id) => {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `/bookings/${id}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['approvals']);
      showSnackbar('Booking berhasil disetujui', 'success');
    },
    onError: (error) => {
      showSnackbar(error.response?.data?.message || 'Gagal menyetujui booking', 'error');
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }) => {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `/bookings/${id}/reject`,
        { reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['approvals']);
      showSnackbar('Booking berhasil ditolak', 'success');
    },
    onError: (error) => {
      showSnackbar(error.response?.data?.message || 'Gagal menolak booking', 'error');
    },
  });

  // Update booking mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `/bookings/${id}`,
        data,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['approvals']);
      setOpenEditDialog(false);
      showSnackbar('Booking berhasil diupdate', 'success');
    },
    onError: (error) => {
      showSnackbar(error.response?.data?.message || 'Gagal mengupdate booking', 'error');
    },
  });

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleApprove = (id) => {
    if (window.confirm('Apakah Anda yakin ingin menyetujui booking ini?')) {
      approveMutation.mutate(id);
    }
  };

  const handleReject = (id) => {
    const reason = prompt('Masukkan alasan penolakan:');
    if (reason !== null) {
      rejectMutation.mutate({ id, reason: reason || 'Tidak ada alasan' });
    }
  };

  const handleViewDetail = (booking) => {
    setSelectedBooking(booking);
    setOpenDetailDialog(true);
  };

  const handleGenerateQR = (booking) => {
    setSelectedBooking(booking);
    setOpenQRDialog(true);
  };

  const handleOpenEdit = (booking) => {
    setSelectedBooking(booking);
    setEditForm({
      booking_date: booking.booking_date,
      start_time: booking.start_time,
      end_time: booking.end_time,
      purpose: booking.purpose || '',
      attendees: booking.attendees || '',
      status: booking.status,
    });
    setOpenEditDialog(true);
  };

  const handleUpdateBooking = () => {
    if (!editForm.booking_date || !editForm.start_time || !editForm.end_time) {
      showSnackbar('Harap lengkapi semua field yang wajib diisi', 'error');
      return;
    }

    if (editForm.start_time >= editForm.end_time) {
      showSnackbar('Jam mulai harus lebih awal dari jam selesai', 'error');
      return;
    }

    const updateData = {
      booking_date: editForm.booking_date,
      start_time: editForm.start_time,
      end_time: editForm.end_time,
      purpose: editForm.purpose || '',
      attendees: parseInt(editForm.attendees) || 0,
      status: editForm.status,
    };

    updateMutation.mutate({ id: selectedBooking.id, data: updateData });
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setFilters({
      search: '',
      status: '',
      date: null,
      startDate: null,
      endDate: null,
    });
    setPage(1);
    setTimeout(() => {
      refetch();
      fetchAllData();
    }, 300);
  };

  const exportToExcel = () => {
    const bookings = data?.data || [];
    if (bookings.length === 0) {
      showSnackbar('Tidak ada data untuk diexport', 'warning');
      return;
    }

    const exportData = bookings.map((item) => ({
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
    XLSX.utils.book_append_sheet(wb, ws, 'Approvals');

    const colWidths = [
      { wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 12 },
      { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 15 }
    ];
    ws['!cols'] = colWidths;

    XLSX.writeFile(wb, `approvals_${new Date().toISOString().split('T')[0]}.xlsx`);
    showSnackbar('Excel berhasil diexport', 'success');
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

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  const bookings = data?.data || [];
  const total = data?.pagination?.total || 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" fontWeight="bold">
          Approval Management
        </Typography>
        <Stack direction="row" spacing={2} flexWrap="wrap">
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={() => {
              refetch();
              fetchAllData();
            }}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={exportToExcel}
            disabled={bookings.length === 0}
          >
            Export Excel
          </Button>
        </Stack>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={3}>
          <Paper sx={{ p: 2, borderLeft: '4px solid #1976d2', background: '#f5f9ff' }}>
            <Typography variant="body2" color="textSecondary">Total Approval</Typography>
            <Typography variant="h5" fontWeight="bold" color="#1976d2">
              {allTotal}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Semua data approval
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Paper sx={{ p: 2, borderLeft: '4px solid #ff9800', background: '#fff8f0' }}>
            <Typography variant="body2" color="textSecondary">Menunggu</Typography>
            <Typography variant="h5" fontWeight="bold" color="warning.main">
              {allPending}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {allTotal > 0 ? Math.round((allPending / allTotal) * 100) : 0}% dari total
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Paper sx={{ p: 2, borderLeft: '4px solid #4caf50', background: '#f0fff4' }}>
            <Typography variant="body2" color="textSecondary">Disetujui</Typography>
            <Typography variant="h5" fontWeight="bold" color="success.main">
              {allConfirmed}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {allTotal > 0 ? Math.round((allConfirmed / allTotal) * 100) : 0}% dari total
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Paper sx={{ p: 2, borderLeft: '4px solid #f44336', background: '#fff5f5' }}>
            <Typography variant="body2" color="textSecondary">Ditolak</Typography>
            <Typography variant="h5" fontWeight="bold" color="error.main">
              {allRejected}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {allTotal > 0 ? Math.round((allRejected / allTotal) * 100) : 0}% dari total
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
            {bookings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                  <Typography color="textSecondary">
                    Tidak ada data approval
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              bookings.map((item, index) => (
                <TableRow key={item.id} hover>
                  <TableCell>{(page - 1) * limit + index + 1}</TableCell>
                  <TableCell>{item.ruangan_name}</TableCell>
                  <TableCell>{item.booking_date}</TableCell>
                  <TableCell>{item.start_time} - {item.end_time}</TableCell>
                  <TableCell>{item.purpose || '-'}</TableCell>
                  <TableCell>{item.attendees || 0}</TableCell>
                  <TableCell>{getStatusChip(item.status)}</TableCell>
                  <TableCell>{item.user_name}</TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap">
                      <Tooltip title="Lihat Detail">
                        <IconButton
                          size="small"
                          color="info"
                          onClick={() => handleViewDetail(item)}
                        >
                          <Visibility />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Generate QR Code">
                        <IconButton
                          size="small"
                          color="secondary"
                          onClick={() => handleGenerateQR(item)}
                        >
                          <QrCode />
                        </IconButton>
                      </Tooltip>

                      {isAuthorized && (
                        <>
                          <Tooltip title="Edit Booking">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleOpenEdit(item)}
                            >
                              <Edit />
                            </IconButton>
                          </Tooltip>

                          {item.status === 'pending' && (
                            <>
                              <Tooltip title="Setujui">
                                <IconButton
                                  size="small"
                                  color="success"
                                  onClick={() => handleApprove(item.id)}
                                >
                                  <CheckCircle />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Tolak">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleReject(item.id)}
                                >
                                  <Cancel />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                        </>
                      )}
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
          Menampilkan {bookings.length} dari {total} data
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
            count={totalPages}
            page={page}
            onChange={(e, value) => setPage(value)}
            color="primary"
            showFirstButton
            showLastButton
          />
        </Stack>
      </Box>

      {/* Dialog Detail */}
      <Dialog open={openDetailDialog} onClose={() => setOpenDetailDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Typography variant="h6" fontWeight="bold">
            Detail Booking
          </Typography>
        </DialogTitle>
        <Divider />
        <DialogContent>
          {selectedBooking && (
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">Ruangan</Typography>
                  <Typography variant="body1" fontWeight="500">{selectedBooking.ruangan_name}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">Status</Typography>
                  <Box>{getStatusChip(selectedBooking.status)}</Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">Tanggal Booking</Typography>
                  <Typography variant="body1">{selectedBooking.booking_date}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">Jam</Typography>
                  <Typography variant="body1">{selectedBooking.start_time} - {selectedBooking.end_time}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="textSecondary">Tujuan</Typography>
                  <Typography variant="body1">{selectedBooking.purpose || '-'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">Jumlah Peserta</Typography>
                  <Typography variant="body1">{selectedBooking.attendees || 0}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">Diminta Oleh</Typography>
                  <Typography variant="body1">{selectedBooking.user_name}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="textSecondary">Tanggal Dibuat</Typography>
                  <Typography variant="body1">
                    {new Date(selectedBooking.created_at).toLocaleString('id-ID')}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDetailDialog(false)} variant="outlined">
            Tutup
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Edit */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Typography variant="h6" fontWeight="bold">
            Edit Booking
          </Typography>
        </DialogTitle>
        <Divider />
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    label="Status"
                  >
                    <MenuItem value="pending">Menunggu</MenuItem>
                    <MenuItem value="confirmed">Disetujui</MenuItem>
                    <MenuItem value="rejected">Ditolak</MenuItem>
                    <MenuItem value="cancelled">Dibatalkan</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <DatePicker
                  label="Tanggal Booking *"
                  value={editForm.booking_date ? parseISO(editForm.booking_date) : null}
                  onChange={(newDate) => setEditForm({
                    ...editForm,
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
                  value={editForm.start_time}
                  onChange={(e) => setEditForm({ ...editForm, start_time: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Jam Selesai *"
                  type="time"
                  value={editForm.end_time}
                  onChange={(e) => setEditForm({ ...editForm, end_time: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Tujuan"
                  multiline
                  rows={3}
                  value={editForm.purpose}
                  onChange={(e) => setEditForm({ ...editForm, purpose: e.target.value })}
                  placeholder="Deskripsikan tujuan booking..."
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Jumlah Peserta"
                  type="number"
                  value={editForm.attendees}
                  onChange={(e) => setEditForm({ ...editForm, attendees: e.target.value })}
                  inputProps={{ min: 1 }}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpenEditDialog(false)} variant="outlined">
            Batal
          </Button>
          <Button
            variant="contained"
            onClick={handleUpdateBooking}
            disabled={updateMutation.isLoading}
          >
            {updateMutation.isLoading ? 'Menyimpan...' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog QR Code */}
      <Dialog open={openQRDialog} onClose={() => setOpenQRDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Typography variant="h6" fontWeight="bold" align="center">
            QR Code Booking
          </Typography>
        </DialogTitle>
        <Divider />
        <DialogContent>
          {selectedBooking && (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <Card sx={{ maxWidth: 400, mx: 'auto', p: 3 }}>
                <CardContent>
                  <QRCode
                    value={JSON.stringify({
                      id: selectedBooking.id,
                      room: selectedBooking.ruangan_name,
                      date: selectedBooking.booking_date,
                      time: `${selectedBooking.start_time} - ${selectedBooking.end_time}`,
                      purpose: selectedBooking.purpose,
                      user: selectedBooking.user_name,
                    })}
                    size={200}
                    level="H"
                    includeMargin={true}
                    style={{ margin: '0 auto' }}
                  />
                  <Typography variant="h6" sx={{ mt: 2 }}>
                    {selectedBooking.ruangan_name}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {selectedBooking.booking_date} | {selectedBooking.start_time} - {selectedBooking.end_time}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {selectedBooking.purpose || '-'}
                  </Typography>
                  <Chip
                    label={selectedBooking.status === 'confirmed' ? '✓ Disetujui' : selectedBooking.status}
                    color={selectedBooking.status === 'confirmed' ? 'success' : 'warning'}
                    size="small"
                    sx={{ mt: 1 }}
                  />
                </CardContent>
              </Card>
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<Print />}
                  onClick={() => window.print()}
                  sx={{ mr: 1 }}
                >
                  Print
                </Button>
                <Button
                  variant="contained"
                  startIcon={<Download />}
                  onClick={() => {
                    const canvas = document.querySelector('canvas');
                    if (canvas) {
                      const link = document.createElement('a');
                      link.download = `qr_booking_${selectedBooking.id}.png`;
                      link.href = canvas.toDataURL('image/png');
                      link.click();
                    }
                  }}
                >
                  Download PNG
                </Button>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenQRDialog(false)} variant="outlined">
            Tutup
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

export default Approval;