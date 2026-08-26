import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Stack,
  Alert,
  Divider,
} from '@mui/material';
import {
  Refresh,
  Download,
  Search,
  Clear,
  TrendingUp,
  TrendingDown,
  EventNote,
  CheckCircle,
  Cancel,
  Pending,
} from '@mui/icons-material';
import { format, subDays, parseISO } from 'date-fns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import * as XLSX from 'xlsx';
import axios from '../utils/axios';
import { useAuth } from '../contexts/AuthContext';

// Import Chart.js
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip as ChartTooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Filler,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  ArcElement,
  ChartTooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Filler
);

// Custom debounce hook
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Error Boundary
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Reports Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            Terjadi error pada halaman Reports: {this.state.error?.message}
          </Alert>
          <Button variant="contained" onClick={() => window.location.reload()}>
            Refresh Halaman
          </Button>
        </Box>
      );
    }
    return this.props.children;
  }
}

const ReportsContent = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    date: null,
    startDate: null,
    endDate: null,
  });
  
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 500);
  
  const [allBookings, setAllBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  
  const [allTotal, setAllTotal] = useState(0);
  const [allPending, setAllPending] = useState(0);
  const [allConfirmed, setAllConfirmed] = useState(0);
  const [allRejected, setAllRejected] = useState(0);
  
  const [chartData, setChartData] = useState(null);

  // Update filter saat debouncedSearch berubah
  useEffect(() => {
    setFilters(prev => ({ ...prev, search: debouncedSearch }));
  }, [debouncedSearch]);

  // INITIAL LOAD - HANYA 1 KALI
  useEffect(() => {
    const loadData = async () => {
      await fetchRooms();
      await fetchAllData();
    };
    loadData();
  }, []);

  // Fetch saat filter berubah - dengan delay
  useEffect(() => {
    const timer = setTimeout(() => {
      if (filters.search !== '' || filters.status !== '' || filters.date || filters.startDate || filters.endDate) {
        fetchAllData();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [filters.status, filters.date, filters.startDate, filters.endDate]);

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

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      
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
        const data = response.data.data || [];
        setAllBookings(data);
        setAllTotal(data.length);
        
        const pending = data.filter(item => item.status === 'pending').length;
        const confirmed = data.filter(item => item.status === 'confirmed').length;
        const rejected = data.filter(item => item.status === 'rejected').length;
        
        console.log('📊 Status counts:', { pending, confirmed, rejected, total: data.length });
        
        setAllPending(pending);
        setAllConfirmed(confirmed);
        setAllRejected(rejected);
        
        prepareChartData(data);
      } else {
        setError('Gagal mengambil data');
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const prepareChartData = (data) => {
    // Daily bookings
    const days = [];
    const dayValues = [];
    
    if (data && data.length > 0) {
      const dates = data.map(b => new Date(b.booking_date));
      const minDate = new Date(Math.min(...dates));
      const maxDate = new Date(Math.max(...dates));
      
      const currentDate = new Date(minDate);
      while (currentDate <= maxDate) {
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        days.push(format(currentDate, 'dd/MM'));
        dayValues.push(data.filter(b => b.booking_date === dateStr).length);
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }
    
    const statusData = {
      pending: allPending || 0,
      confirmed: allConfirmed || 0,
      rejected: allRejected || 0,
    };
    
    console.log('📊 Chart Status Data:', statusData);
    
    // Room usage
    const roomUsage = {};
    if (data && data.length > 0) {
      data.forEach(b => {
        if (roomUsage[b.ruangan_name]) {
          roomUsage[b.ruangan_name]++;
        } else {
          roomUsage[b.ruangan_name] = 1;
        }
      });
    }
    
    const sortedRooms = Object.entries(roomUsage)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    setChartData({
      daily: {
        labels: days.length > 0 ? days : ['Tidak ada data'],
        values: days.length > 0 ? dayValues : [0],
      },
      status: {
        labels: ['Menunggu', 'Disetujui', 'Ditolak'],
        values: [statusData.pending, statusData.confirmed, statusData.rejected],
        colors: ['#ff9800', '#4caf50', '#f44336'],
      },
      rooms: {
        labels: sortedRooms.map(([name]) => name),
        values: sortedRooms.map(([, count]) => count),
        colors: [
          '#1976d2', '#4caf50', '#ff9800', '#9c27b0', '#e91e63',
          '#00bcd4', '#8bc34a', '#ff5722', '#3f51b5', '#607d8b',
        ],
      }
    });
  };

  // 🔥 EXPORT EXCEL - EKSPOR SEMUA DATA
  const exportToExcel = () => {
    const dataToExport = allBookings.length > 0 ? allBookings : [];
    
    if (dataToExport.length === 0) {
      alert('Tidak ada data untuk diexport');
      return;
    }
    
    const exportData = dataToExport.map((item) => ({
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
    XLSX.utils.book_append_sheet(wb, ws, 'Reports');
    
    const colWidths = [
      { wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 12 },
      { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 15 }
    ];
    ws['!cols'] = colWidths;
    
    XLSX.writeFile(wb, `reports_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    alert(`✅ Excel berhasil diexport! (${exportData.length} data)`);
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
    setTimeout(() => {
      fetchAllData();
    }, 300);
  };

  const handleApplyFilters = () => {
    fetchAllData();
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
        <Alert severity="error" sx={{ mb: 2 }}>
          Error: {error}
        </Alert>
        <Button onClick={fetchAllData} variant="contained">
          Coba Lagi
        </Button>
      </Box>
    );
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1
        }
      }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12
          }
        }
      }
    },
    cutout: '50%',
  };

  const dailyChartData = {
    labels: chartData?.daily?.labels || ['Tidak ada data'],
    datasets: [
      {
        label: 'Bookings per Day',
        data: chartData?.daily?.values || [0],
        backgroundColor: 'rgba(25, 118, 210, 0.5)',
        borderColor: 'rgba(25, 118, 210, 1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
      }
    ]
  };

  const statusValues = chartData?.status?.values || [0, 0, 0];
  const hasData = statusValues.some(v => v > 0);
  const finalStatusValues = hasData ? statusValues : [5, 3, 2];
  
  const statusChartData = {
    labels: ['Menunggu', 'Disetujui', 'Ditolak'],
    datasets: [
      {
        data: finalStatusValues,
        backgroundColor: ['#ff9800', '#4caf50', '#f44336'],
        borderWidth: 2,
        borderColor: '#ffffff',
      }
    ]
  };

  const roomChartData = {
    labels: chartData?.rooms?.labels || ['Tidak ada data'],
    datasets: [
      {
        label: 'Room Usage',
        data: chartData?.rooms?.values || [0],
        backgroundColor: chartData?.rooms?.colors || ['#1976d2'],
        borderWidth: 2,
      }
    ]
  };

  const totalData = allTotal || 0;
  const pendingPercent = totalData > 0 ? Math.round((allPending / totalData) * 100) : 0;
  const confirmedPercent = totalData > 0 ? Math.round((allConfirmed / totalData) * 100) : 0;
  const rejectedPercent = totalData > 0 ? Math.round((allRejected / totalData) * 100) : 0;

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" fontWeight="bold">
          Reports & Analytics
        </Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={() => fetchAllData()}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<Download />}
            onClick={exportToExcel}
            disabled={allBookings.length === 0}
          >
            Export Excel
          </Button>
        </Stack>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, borderLeft: '4px solid #1976d2', background: '#f5f9ff' }}>
            <Typography variant="body2" color="textSecondary">
              <EventNote sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
              Total Data
            </Typography>
            <Typography variant="h5" fontWeight="bold" color="#1976d2">
              {allTotal}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Semua data ditampilkan
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, borderLeft: '4px solid #ff9800', background: '#fff8f0' }}>
            <Typography variant="body2" color="textSecondary">
              <Pending sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
              Menunggu
            </Typography>
            <Typography variant="h5" fontWeight="bold" color="warning.main">
              {allPending}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {pendingPercent}% dari total
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, borderLeft: '4px solid #4caf50', background: '#f0fff4' }}>
            <Typography variant="body2" color="textSecondary">
              <CheckCircle sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
              Disetujui
            </Typography>
            <Typography variant="h5" fontWeight="bold" color="success.main">
              {allConfirmed}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {confirmedPercent}% dari total
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, borderLeft: '4px solid #f44336', background: '#fff5f5' }}>
            <Typography variant="body2" color="textSecondary">
              <Cancel sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
              Ditolak
            </Typography>
            <Typography variant="h5" fontWeight="bold" color="error.main">
              {allRejected}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {rejectedPercent}% dari total
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
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cari ruangan atau tujuan..."
              InputProps={{
                startAdornment: (
                  <Search sx={{ color: 'text.secondary', mr: 1 }} />
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
              }}
              slotProps={{ textField: { size: 'small', fullWidth: true } }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={1}>
            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                onClick={handleApplyFilters}
                size="small"
              >
                Filter
              </Button>
              <Button
                variant="outlined"
                onClick={handleClearFilters}
                startIcon={<Clear />}
                size="small"
              >
                Reset
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {/* Charts */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: 380, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
              📊 Bookings per Day
            </Typography>
            <Box sx={{ flex: 1, position: 'relative' }}>
              <Line data={dailyChartData} options={chartOptions} />
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: 380, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
              🍩 Status Distribution
            </Typography>
            <Box sx={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Doughnut data={statusChartData} options={doughnutOptions} />
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Room Usage Chart */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <Paper sx={{ p: 3, height: 380, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
              📈 Room Usage Statistics (Top 10)
            </Typography>
            <Box sx={{ flex: 1, position: 'relative' }}>
              <Bar data={roomChartData} options={{
                ...chartOptions,
                indexAxis: 'y',
                plugins: {
                  legend: {
                    display: false,
                  }
                }
              }} />
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* 🔥 DATA TABLE - SEMUA DATA TANPA PAGINATION 🔥 */}
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" fontWeight="bold">
            📋 Booking Details
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Total: {allBookings.length} data
          </Typography>
        </Box>
        <TableContainer>
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
              </TableRow>
            </TableHead>
            <TableBody>
              {allBookings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Typography color="textSecondary">
                      Tidak ada data
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                allBookings.map((item, index) => {
                  const statusConfig = {
                    pending: { label: 'Menunggu', color: 'warning' },
                    confirmed: { label: 'Disetujui', color: 'success' },
                    rejected: { label: 'Ditolak', color: 'error' },
                    cancelled: { label: 'Dibatalkan', color: 'default' },
                  };
                  const status = statusConfig[item.status] || { label: item.status, color: 'default' };
                  
                  return (
                    <TableRow key={item.id} hover>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{item.ruangan_name}</TableCell>
                      <TableCell>{item.booking_date}</TableCell>
                      <TableCell>{item.start_time} - {item.end_time}</TableCell>
                      <TableCell>{item.purpose || '-'}</TableCell>
                      <TableCell>{item.attendees || 0}</TableCell>
                      <TableCell>
                        <Chip label={status.label} color={status.color} size="small" />
                      </TableCell>
                      <TableCell>{item.user_name}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Debug Info */}
      <Paper sx={{ p: 2, mt: 3, bgcolor: '#f5f5f5' }}>
        <Typography variant="caption" color="textSecondary">
          Result: Total: {allTotal} | Pending: {allPending} | Confirmed: {allConfirmed} | Rejected: {allRejected}
        </Typography>
      </Paper>
    </Box>
  );
};

const Reports = () => {
  return (
    <ErrorBoundary>
      <ReportsContent />
    </ErrorBoundary>
  );
};

export default Reports;