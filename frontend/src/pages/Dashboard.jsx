import React, { useState, useEffect } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Avatar,
  Stack,
  Alert,
  Button,
} from '@mui/material';
import {
  MeetingRoom,
  EventNote,
  Pending,
  CheckCircle,
  Cancel,
  People,
  Refresh,
} from '@mui/icons-material';
import axios from '../utils/axios';
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

const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({
    totalRooms: 0,
    totalBookings: 0,
    pendingApprovals: 0,
    confirmedBookings: 0,
    rejectedBookings: 0,
    totalUsers: 0,
    recentBookings: [],
  });

  // 🔥 FETCH DATA DARI API YANG SUDAH ADA
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      const role = user?.role_name?.toLowerCase();
      
      // 🔥 Ambil data bookings (untuk statistik) - SEMUA ROLE BISA
      const bookingsRes = await axios.get('/bookings', {
        params: { limit: 10000 },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // 🔥 Ambil data ruangan - SEMUA ROLE BISA
      const roomsRes = await axios.get('/ruangan/all', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const bookings = bookingsRes.data.data || [];
      const rooms = roomsRes.data || [];

      // 🔥 Hitung statistik
      const pending = bookings.filter(b => b.status === 'pending').length;
      const confirmed = bookings.filter(b => b.status === 'confirmed').length;
      const rejected = bookings.filter(b => b.status === 'rejected').length;
      
      // 🔥 Recent bookings (5 terakhir)
      const recent = bookings
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5);

      // 🔥 Ambil data users - HANYA SUPERADMIN YANG BISA
      let totalUsers = 0;
      if (role === 'superadmin') {
        try {
          const usersRes = await axios.get('/users', {
            params: { limit: 10000 },
            headers: { Authorization: `Bearer ${token}` }
          });
          totalUsers = usersRes.data.data?.length || 0;
        } catch (err) {
          console.log('⚠️ Cannot fetch users (only superadmin):', err.message);
        }
      }

      setData({
        totalRooms: rooms.length,
        totalBookings: bookings.length,
        pendingApprovals: pending,
        confirmedBookings: confirmed,
        rejectedBookings: rejected,
        totalUsers: totalUsers,
        recentBookings: recent,
      });
      
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      // 🔥 Jangan tampilkan error untuk 403, hanya log saja
      if (err.response?.status !== 403) {
        setError(err.message || 'Gagal mengambil data');
      }
    } finally {
      setLoading(false);
    }
  };

  // 🔥 EFFECT UNTUK FETCH DATA (HANYA 1 KALI)
  useEffect(() => {
    fetchData();
  }, []);

  // 🔥 CEK ROLE USER
  const isSuperAdmin = user?.role_name?.toLowerCase() === 'superadmin';

  const stats = [
    {
      title: 'Total Ruangan',
      value: data.totalRooms,
      icon: <MeetingRoom />,
      color: '#1976d2',
      bgColor: '#e3f2fd',
      show: true, // Semua role bisa lihat
    },
    {
      title: 'Total Booking',
      value: data.totalBookings,
      icon: <EventNote />,
      color: '#2e7d32',
      bgColor: '#e8f5e9',
      show: true,
    },
    {
      title: 'Menunggu Approval',
      value: data.pendingApprovals,
      icon: <Pending />,
      color: '#ed6c02',
      bgColor: '#fff3e0',
      show: true,
    },
    {
      title: 'Disetujui',
      value: data.confirmedBookings,
      icon: <CheckCircle />,
      color: '#2e7d32',
      bgColor: '#e8f5e9',
      show: true,
    },
    {
      title: 'Ditolak',
      value: data.rejectedBookings,
      icon: <Cancel />,
      color: '#d32f2f',
      bgColor: '#ffebee',
      show: true,
    },
    {
      title: 'Total Users',
      value: data.totalUsers,
      icon: <People />,
      color: '#6a1b9a',
      bgColor: '#f3e5f5',
      show: isSuperAdmin, // 🔥 HANYA SUPERADMIN YANG LIHAT
    },
  ];

  const getStatusColor = (status) => {
    const colors = {
      pending: 'warning',
      confirmed: 'success',
      rejected: 'error',
      cancelled: 'default',
    };
    return colors[status] || 'default';
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Menunggu',
      confirmed: 'Disetujui',
      rejected: 'Ditolak',
      cancelled: 'Dibatalkan',
    };
    return labels[status] || status;
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
        <Button onClick={fetchData} variant="contained">
          Coba Lagi
        </Button>
      </Box>
    );
  }

  // 🔥 FILTER STATS YANG BOLEH DITAMPILKAN
  const visibleStats = stats.filter(stat => stat.show);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Welcome back, {user?.full_name || 'User'}!
        </Typography>
        <Typography variant="body1" color="textSecondary">
          {isSuperAdmin 
            ? 'Here\'s what\'s happening with your bookings today.' 
            : 'Here\'s your booking summary.'}
        </Typography>
      </Box>

      {/* 🔥 STATS GRID - SESUAI ROLE */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {visibleStats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card sx={{ height: '100%', borderRadius: 2, boxShadow: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" fontWeight="bold">
                      {stat.value}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {stat.title}
                    </Typography>
                  </Box>
                  <Avatar
                    sx={{
                      bgcolor: stat.bgColor,
                      color: stat.color,
                      width: 48,
                      height: 48,
                    }}
                  >
                    {stat.icon}
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* 🔥 QUICK ACTIONS */}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Quick Actions
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <Box
                  sx={{
                    p: 2,
                    bgcolor: 'primary.50',
                    borderRadius: 2,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'primary.100' },
                  }}
                  onClick={() => window.location.href = '/bookings'}
                >
                  <Typography variant="subtitle2" fontWeight="medium" color="primary.main">
                    + New Booking
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Book a room for your meeting
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} sm={4}>
                <Box
                  sx={{
                    p: 2,
                    bgcolor: 'success.50',
                    borderRadius: 2,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'success.100' },
                  }}
                  onClick={() => window.location.href = '/approval'}
                >
                  <Typography variant="subtitle2" fontWeight="medium" color="success.main">
                    Pending Approvals
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {data.pendingApprovals} bookings waiting for approval
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} sm={4}>
                <Box
                  sx={{
                    p: 2,
                    bgcolor: 'warning.50',
                    borderRadius: 2,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'warning.100' },
                  }}
                  onClick={() => window.location.href = '/qr-scanner'}
                >
                  <Typography variant="subtitle2" fontWeight="medium" color="warning.main">
                    Scan QR Code
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Verify booking status
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>

      {/* 🔥 RECENT BOOKINGS */}
      <Paper sx={{ p: 3, mt: 3, borderRadius: 2 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          Recent Bookings
        </Typography>
        <Box sx={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e0e0e0' }}>
                <th style={{ textAlign: 'left', padding: '8px 16px', fontWeight: 600, color: '#757575' }}>Room</th>
                <th style={{ textAlign: 'left', padding: '8px 16px', fontWeight: 600, color: '#757575' }}>Date</th>
                <th style={{ textAlign: 'left', padding: '8px 16px', fontWeight: 600, color: '#757575' }}>Time</th>
                <th style={{ textAlign: 'left', padding: '8px 16px', fontWeight: 600, color: '#757575' }}>Status</th>
                <th style={{ textAlign: 'left', padding: '8px 16px', fontWeight: 600, color: '#757575' }}>Requested By</th>
              </tr>
            </thead>
            <tbody>
              {data.recentBookings && data.recentBookings.length > 0 ? (
                data.recentBookings.map((booking, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #f5f5f5' }}>
                    <td style={{ padding: '8px 16px' }}>{booking.ruangan_name}</td>
                    <td style={{ padding: '8px 16px' }}>{booking.booking_date}</td>
                    <td style={{ padding: '8px 16px' }}>{booking.start_time} - {booking.end_time}</td>
                    <td style={{ padding: '8px 16px' }}>
                      <span
                        style={{
                          padding: '2px 12px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 500,
                          backgroundColor: 
                            booking.status === 'pending' ? '#fff3e0' :
                            booking.status === 'confirmed' ? '#e8f5e9' :
                            booking.status === 'rejected' ? '#ffebee' : '#f5f5f5',
                          color:
                            booking.status === 'pending' ? '#ed6c02' :
                            booking.status === 'confirmed' ? '#2e7d32' :
                            booking.status === 'rejected' ? '#d32f2f' : '#757575',
                        }}
                      >
                        {getStatusLabel(booking.status)}
                      </span>
                    </td>
                    <td style={{ padding: '8px 16px' }}>{booking.user_name}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: '#757575' }}>
                    No recent bookings
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Box>
      </Paper>
    </Box>
  );
};

export default Dashboard;