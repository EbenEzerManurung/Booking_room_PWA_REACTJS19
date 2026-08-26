import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  CircularProgress,
  Grid,
  Chip,
  Divider,
  IconButton,
  TextField,
} from '@mui/material';
import {
  QrCodeScanner,
  CameraAlt,
  Close,
  CheckCircle,
  Cancel,
  Refresh,
  Search,
  ContentPaste,
} from '@mui/icons-material';
import QrScanner from 'qr-scanner';
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

const QRScannerPage = () => {
  const { user } = useAuth();
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [openResultDialog, setOpenResultDialog] = useState(false);
  const [bookingDetail, setBookingDetail] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [lastScannedText, setLastScannedText] = useState('');
  
  // 🔥 STATE UNTUK SEARCH MANUAL
  const [manualId, setManualId] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 500);
  
  const videoRef = useRef(null);
  const qrScannerRef = useRef(null);
  const isMounted = useRef(true);

  const isAuthorized = user?.role_name?.toLowerCase() === 'superadmin' || 
                       user?.role_name?.toLowerCase() === 'ga';

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      stopScanner();
    };
  }, []);

  // 🔥 EFFECT UNTUK MANUAL SEARCH DENGAN DEBOUNCE
  useEffect(() => {
    if (debouncedSearch) {
      handleManualSearch(debouncedSearch);
    }
  }, [debouncedSearch]);

  const startScanner = async () => {
    try {
      setError(null);
      setScanning(true);
      setLastScannedText('');

      await new Promise(resolve => setTimeout(resolve, 500));

      if (!videoRef.current) {
        throw new Error('Video element not found. Silakan refresh halaman.');
      }

      console.log('✅ Video element found, starting qr-scanner...');

      qrScannerRef.current = new QrScanner(
        videoRef.current,
        (result) => {
          console.log('✅ QR Code detected!');
          console.log('📱 Text:', result.data);
          
          setLastScannedText(result.data);
          
          stopScanner();
          
          if (isMounted.current) {
            handleScanResult(result.data);
          }
        },
        {
          onDecodeError: (error) => {
            if (!error.includes('No QR code') && !error.includes('QR code')) {
              console.log('Scan error:', error);
            }
          },
          preferredCamera: 'environment',
          highlightScanRegion: true,
          highlightCodeOutline: true,
          maxScansPerSecond: 5,
          returnDetailedScanResult: true,
        }
      );

      await qrScannerRef.current.start();
      console.log('✅ Scanner started successfully!');
      showSnackbar('Scanner siap! Arahkan QR Code ke kamera', 'success');
    } catch (err) {
      console.error('Error starting scanner:', err);
      if (isMounted.current) {
        setError(err.message || 'Gagal mengakses kamera. Pastikan kamera terhubung.');
        setScanning(false);
        showSnackbar('Gagal memulai scanner: ' + err.message, 'error');
      }
    }
  };

  const stopScanner = async () => {
    try {
      if (qrScannerRef.current) {
        try {
          await qrScannerRef.current.stop();
          qrScannerRef.current.destroy();
          qrScannerRef.current = null;
        } catch (e) {
          console.log('Stop error:', e);
        }
      }
    } catch (err) {
      console.error('Error stopping scanner:', err);
    } finally {
      if (isMounted.current) {
        setScanning(false);
      }
    }
  };

  // 🔥 FUNGSI FETCH BOOKING YANG DIOPTIMASI
  const fetchBookingById = useCallback(async (bookingId) => {
    try {
      const token = localStorage.getItem('token');
      let booking = null;
      let usedMethod = '';

      // Method 1: Direct by ID
      try {
        console.log(`🔍 Method 1: GET /bookings/${bookingId}`);
        const response = await axios.get(`/bookings/${bookingId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data.success && response.data.data) {
          booking = response.data.data;
          usedMethod = 'Direct by ID';
          console.log('✅ Found via Method 1');
        }
      } catch (err) {
        console.log('⚠️ Method 1 failed');
      }

      // Method 2: Search
      if (!booking) {
        try {
          console.log(`🔍 Method 2: GET /bookings?search=${bookingId}`);
          const response = await axios.get(`/bookings`, {
            params: { 
              search: bookingId,
              limit: 100 
            },
            headers: { Authorization: `Bearer ${token}` }
          });
          if (response.data.success && response.data.data) {
            const data = response.data.data;
            booking = Array.isArray(data) ? data.find(b => 
              String(b.id) === String(bookingId) || 
              b.id == bookingId ||
              String(b.booking_id) === String(bookingId)
            ) : data;
            if (booking) {
              usedMethod = 'Search by ID';
              console.log('✅ Found via Method 2');
            }
          }
        } catch (err) {
          console.log('⚠️ Method 2 failed');
        }
      }

      // Method 3: All bookings
      if (!booking) {
        try {
          console.log('🔍 Method 3: GET /bookings (all)');
          const response = await axios.get(`/bookings`, {
            params: { limit: 10000 },
            headers: { Authorization: `Bearer ${token}` }
          });
          if (response.data.success && response.data.data) {
            const data = response.data.data;
            booking = Array.isArray(data) ? data.find(b => 
              String(b.id) === String(bookingId) || 
              b.id == bookingId
            ) : data;
            if (booking) {
              usedMethod = 'All bookings';
              console.log('✅ Found via Method 3');
            }
          }
        } catch (err) {
          console.log('⚠️ Method 3 failed');
        }
      }

      return { booking, usedMethod };
    } catch (err) {
      console.error('Error fetching booking:', err);
      return { booking: null, usedMethod: '' };
    }
  }, []);

  const handleScanResult = async (decodedText) => {
    try {
      setLoading(true);
      setError(null);

      console.log('📱 Raw scanned text:', decodedText);

      let qrData = null;
      let bookingId = null;
      
      try {
        let cleanText = decodedText.trim();
        qrData = JSON.parse(cleanText);
        console.log('✅ Parsed as JSON:', qrData);
        
        bookingId = qrData.id || 
                    qrData.bookingId || 
                    qrData.booking_id || 
                    qrData.ID || 
                    qrData.bookingID;
        
        if (!bookingId) {
          for (const key of Object.keys(qrData)) {
            const value = qrData[key];
            if (typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(value))) {
              bookingId = value;
              console.log('✅ Found ID in field:', key, '=', value);
              break;
            }
          }
        }
      } catch (e) {
        console.log('⚠️ Not JSON, extracting ID from text');
        const idMatch = decodedText.match(/\d+/);
        if (idMatch) {
          bookingId = idMatch[0];
          console.log('✅ Extracted ID from text:', bookingId);
        } else {
          const idPattern = /id[:\s]*(\d+)/i;
          const match = decodedText.match(idPattern);
          if (match) {
            bookingId = match[1];
            console.log('✅ Found ID with pattern:', bookingId);
          }
        }
      }

      console.log('🔍 Final Booking ID:', bookingId);

      if (!bookingId) {
        setError('ID booking tidak ditemukan dalam QR Code');
        showSnackbar('ID booking tidak ditemukan', 'error');
        setLoading(false);
        return;
      }

      const { booking, usedMethod } = await fetchBookingById(bookingId);

      if (booking) {
        console.log('✅ Booking found via:', usedMethod);
        setBookingDetail(booking);
        setOpenResultDialog(true);
        showSnackbar('QR Code berhasil dipindai!', 'success');
      } else {
        console.log('❌ Booking NOT found for ID:', bookingId);
        setError(`Booking dengan ID "${bookingId}" tidak ditemukan`);
        showSnackbar(`Booking dengan ID "${bookingId}" tidak ditemukan`, 'error');
      }
    } catch (err) {
      console.error('❌ Error processing QR:', err);
      setError(err.message || 'Gagal memproses QR Code');
      showSnackbar('Gagal memproses QR Code', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 🔥 MANUAL SEARCH DENGAN OPTIMASI
  const handleManualSearch = async (searchTerm) => {
    if (!searchTerm || !searchTerm.trim()) {
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      let booking = null;
      
      // Coba langsung
      try {
        const response = await axios.get(`/bookings/${searchTerm.trim()}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data.success) {
          booking = response.data.data;
        }
      } catch (err) {
        // Coba search
        try {
          const response = await axios.get(`/bookings`, {
            params: { search: searchTerm.trim() },
            headers: { Authorization: `Bearer ${token}` }
          });
          if (response.data.success && response.data.data) {
            const data = response.data.data;
            booking = Array.isArray(data) ? data.find(b => 
              String(b.id) === String(searchTerm.trim()) || b.id == searchTerm.trim()
            ) : data;
          }
        } catch (err2) {}
      }

      if (booking) {
        setBookingDetail(booking);
        setOpenResultDialog(true);
        showSnackbar('Booking ditemukan!', 'success');
      } else {
        showSnackbar(`Booking dengan ID "${searchTerm.trim()}" tidak ditemukan`, 'error');
      }
    } catch (err) {
      showSnackbar('Error: ' + (err.response?.data?.message || err.message), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setSearchInput(text);
      showSnackbar('Data berhasil di-paste!', 'success');
    } catch (err) {
      showSnackbar('Gagal paste dari clipboard', 'error');
    }
  };

  const handleApprove = async (id) => {
    if (!window.confirm('Apakah Anda yakin ingin menyetujui booking ini?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `/bookings/${id}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        showSnackbar('Booking berhasil disetujui!', 'success');
        setOpenResultDialog(false);
        const { booking } = await fetchBookingById(id);
        if (booking) {
          setBookingDetail(booking);
        }
      }
    } catch (error) {
      showSnackbar(error.response?.data?.message || 'Gagal menyetujui booking', 'error');
    }
  };

  const handleReject = async (id) => {
    const reason = prompt('Masukkan alasan penolakan:');
    if (reason === null) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `/bookings/${id}/reject`,
        { reason: reason || 'Tidak ada alasan' },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        showSnackbar('Booking berhasil ditolak', 'success');
        setOpenResultDialog(false);
        const { booking } = await fetchBookingById(id);
        if (booking) {
          setBookingDetail(booking);
        }
      }
    } catch (error) {
      showSnackbar(error.response?.data?.message || 'Gagal menolak booking', 'error');
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const getStatusChip = (status) => {
    const config = {
      pending: { label: 'Menunggu', color: 'warning' },
      confirmed: { label: 'Disetujui', color: 'success' },
      rejected: { label: 'Ditolak', color: 'error' },
      cancelled: { label: 'Dibatalkan', color: 'default' },
    };
    const { label, color } = config[status] || { label: status, color: 'default' };
    return <Chip label={label} color={color} size="medium" />;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" fontWeight="bold">
          QR Code Scanner
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {scanning ? (
            <Button
              variant="contained"
              color="error"
              startIcon={<Close />}
              onClick={stopScanner}
            >
              Stop Scan
            </Button>
          ) : (
            <Button
              variant="contained"
              startIcon={<QrCodeScanner />}
              onClick={startScanner}
              disabled={loading}
            >
              Start Scan
            </Button>
          )}
        </Box>
      </Box>

      <Paper sx={{ p: 3, mb: 3 }}>
        {error ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
            <Button
              variant="contained"
              startIcon={<Refresh />}
              onClick={() => {
                setError(null);
                startScanner();
              }}
            >
              Coba Lagi
            </Button>
          </Box>
        ) : scanning ? (
          <Box>
            <Box
              sx={{
                width: '100%',
                maxWidth: '500px',
                margin: '0 auto',
                position: 'relative',
                overflow: 'hidden',
                borderRadius: 2,
                backgroundColor: '#000',
                minHeight: '400px',
              }}
            >
              <video
                ref={videoRef}
                style={{
                  width: '100%',
                  height: '100%',
                  minHeight: '400px',
                  objectFit: 'cover',
                }}
                autoPlay
                playsInline
                muted
              />
            </Box>
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Typography variant="caption" color="textSecondary">
                Arahkan QR Code ke dalam kotak
              </Typography>
            </Box>
            {lastScannedText && (
              <Alert severity="info" sx={{ mt: 2 }}>
                <strong>Data terdeteksi:</strong> {lastScannedText.substring(0, 100)}
                {lastScannedText.length > 100 && '...'}
              </Alert>
            )}
          </Box>
        ) : (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <CameraAlt sx={{ fontSize: 80, color: 'grey.400', mb: 2 }} />
            <Typography variant="h6" color="textSecondary">
              Siap Scan QR Code
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Klik "Start Scan" untuk memulai
            </Typography>
            <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
              Pastikan QR Code jelas dan pencahayaan cukup
            </Typography>
            {lastScannedText && (
              <Paper sx={{ mt: 3, p: 2, maxWidth: 500, mx: 'auto', bgcolor: '#f5f5f5' }}>
                <Typography variant="subtitle2" color="primary">
                  Hasil Scan Terakhir:
                </Typography>
                <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                  {lastScannedText}
                </Typography>
              </Paper>
            )}
          </Box>
        )}
      </Paper>

      {/* 🔥 MANUAL SEARCH - DENGAN DEBOUNCE */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          <Search sx={{ mr: 1, verticalAlign: 'middle' }} />
          Cari Manual (Alternatif)
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={8}>
            <TextField
              fullWidth
              size="small"
              label="Masukkan ID Booking"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Contoh: 1, 2, 3..."
              helperText={searchInput ? `🔍 Mencari ID: "${searchInput}"` : 'Masukkan ID booking untuk mencari'}
              InputProps={{
                endAdornment: (
                  <IconButton onClick={handlePaste} size="small">
                    <ContentPaste />
                  </IconButton>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Button
              fullWidth
              variant="contained"
              onClick={() => handleManualSearch(searchInput)}
              disabled={loading || !searchInput.trim()}
              sx={{ height: '100%' }}
            >
              {loading ? <CircularProgress size={24} /> : 'Cari Booking'}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <Dialog open={openResultDialog} onClose={() => setOpenResultDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" fontWeight="bold">Detail Booking</Typography>
            <IconButton onClick={() => setOpenResultDialog(false)}><Close /></IconButton>
          </Box>
        </DialogTitle>
        <Divider />
        <DialogContent>
          {bookingDetail ? (
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Alert severity={bookingDetail.status === 'confirmed' ? 'success' : 
                           bookingDetail.status === 'rejected' ? 'error' : 'warning'} variant="outlined">
                    Status: {getStatusChip(bookingDetail.status)}
                  </Alert>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">ID Booking</Typography>
                  <Typography variant="body1" fontWeight="500">#{bookingDetail.id}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">Ruangan</Typography>
                  <Typography variant="body1" fontWeight="500">{bookingDetail.ruangan_name}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">Tanggal Booking</Typography>
                  <Typography variant="body1">{bookingDetail.booking_date}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">Jam</Typography>
                  <Typography variant="body1">{bookingDetail.start_time} - {bookingDetail.end_time}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="textSecondary">Tujuan</Typography>
                  <Typography variant="body1">{bookingDetail.purpose || '-'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">Jumlah Peserta</Typography>
                  <Typography variant="body1">{bookingDetail.attendees || 0}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">Diminta Oleh</Typography>
                  <Typography variant="body1">{bookingDetail.user_name}</Typography>
                </Grid>
              </Grid>
            </Box>
          ) : (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <CircularProgress />
              <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
                Memuat data booking...
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpenResultDialog(false)} variant="outlined">Tutup</Button>
          {bookingDetail && bookingDetail.status === 'pending' && isAuthorized && (
            <>
              <Button 
                variant="contained" 
                color="success" 
                startIcon={<CheckCircle />} 
                onClick={() => handleApprove(bookingDetail.id)}
              >
                Setujui
              </Button>
              <Button 
                variant="contained" 
                color="error" 
                startIcon={<Cancel />} 
                onClick={() => handleReject(bookingDetail.id)}
              >
                Tolak
              </Button>
            </>
          )}
          {bookingDetail && bookingDetail.status !== 'pending' && (
            <Chip 
              label={`Status: ${bookingDetail.status === 'confirmed' ? 'Disetujui' : 'Ditolak'}`}
              color={bookingDetail.status === 'confirmed' ? 'success' : 'error'} 
            />
          )}
        </DialogActions>
      </Dialog>

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

export default QRScannerPage;