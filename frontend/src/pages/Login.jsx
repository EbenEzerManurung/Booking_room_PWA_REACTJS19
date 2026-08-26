import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Divider,
  Stack,
  Avatar,
  Snackbar,
} from '@mui/material';
import {
  Email,
  Lock,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';

const Login = () => {
  const { login, isAuthenticated, error: authError } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  // Set error dari context jika ada
  useEffect(() => {
    if (authError) {
      setError(authError);
    }
  }, [authError]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validasi form
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');
    
    console.log('🔐 Attempting login with:', { 
      email: formData.email, 
      passwordLength: formData.password.length 
    });

    try {
      const result = await login(formData.email.trim(), formData.password.trim());
      
      console.log('📊 Login result:', result);
      
      if (result.success) {
        setSnackbar({
          open: true,
          message: 'Login successful! Redirecting...',
          severity: 'success',
        });
        setTimeout(() => {
          navigate('/');
        }, 1000);
      } else {
        setError(result.message || 'Login failed. Please check your credentials.');
        setSnackbar({
          open: true,
          message: result.message || 'Login failed',
          severity: 'error',
        });
      }
    } catch (err) {
      console.error('❌ Unexpected error:', err);
      setError('An unexpected error occurred. Please try again.');
      setSnackbar({
        open: true,
        message: 'An unexpected error occurred',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDemoClick = (email, password) => {
    setFormData({ email, password });
    setError('');
    console.log('📝 Demo account selected:', email);
    
    // Auto-submit after 500ms
    setTimeout(() => {
      handleSubmit(new Event('submit'));
    }, 500);
  };

  // ============================================
  // UPDATE DEMO ACCOUNTS DENGAN PASSWORD YANG BENAR
  // ============================================
  const demoAccounts = [
    { role: 'Super Admin', email: 'superadmin@company.com', password: 'superadmin123' },
    { role: 'Employee', email: 'john.doe@company.com', password: 'employee123' },
    { role: 'Receptionist', email: 'receptionist@company.com', password: 'receptionist123' },
    { role: 'GA Officer', email: 'ga@company.com', password: 'ga123' },
  ];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1976d2 0%, #0d47a1 100%)',
        p: 2,
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={24}
          sx={{
            p: 4,
            borderRadius: 4,
            backdropFilter: 'blur(10px)',
            bgcolor: 'rgba(255,255,255,0.95)',
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Avatar
              src="/favicon.png"
              alt="Logo"
              sx={{
                width: 80,
                height: 80,
                mx: 'auto',
                mb: 2,
                border: '3px solid #1976d2',
              }}
              onError={(e) => {
                e.target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MCIgaGVpZ2h0PSI4MCIgdmlld0JveD0iMCAwIDgwIDgwIj48cmVjdCB3aWR0aD0iODAiIGhlaWdodD0iODAiIHJ4PSIxNSIgZmlsbD0iIzE5NzZkMiIvPjx0ZXh0IHg9IjQwIiB5PSI1MCIgZm9udC1zaXplPSI0MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiPvCfjKI8L3RleHQ+PC9zdmc+';
              }}
            />
            <Typography variant="h4" fontWeight="bold" color="primary.main">
              Booking Room
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Sistem Manajemen Booking Ruangan Enterprise
            </Typography>
            <Divider sx={{ mt: 2 }} />
          </Box>

          {error && (
            <Alert 
              severity="error" 
              sx={{ mb: 3, borderRadius: 2 }}
              onClose={() => setError('')}
            >
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              variant="outlined"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={loading}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email color="action" />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{ mb: 3 }}
              required
            />

            <TextField
              fullWidth
              label="Password"
              type={showPassword ? 'text' : 'password'}
              variant="outlined"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              disabled={loading}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton 
                        onClick={() => setShowPassword(!showPassword)} 
                        edge="end"
                        disabled={loading}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
              sx={{ mb: 1 }}
              required
            />

            <Button
              fullWidth
              type="submit"
              variant="contained"
              disabled={loading}
              sx={{
                py: 1.5,
                mt: 2,
                borderRadius: 2,
                fontSize: '1rem',
                fontWeight: 600,
                position: 'relative',
              }}
            >
              {loading ? (
                <>
                  <CircularProgress size={24} color="inherit" sx={{ mr: 2 }} />
                  Logging in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          <Box sx={{ mt: 3 }}>
            <Typography variant="caption" color="textSecondary" display="block" align="center">
              Demo Accounts (click to auto-fill & login)
            </Typography>
            <Stack 
              direction="row" 
              spacing={1} 
              sx={{ mt: 1, flexWrap: 'wrap', justifyContent: 'center' }}
            >
              {demoAccounts.map((account) => (
                <Button
                  key={account.role}
                  size="small"
                  variant="outlined"
                  onClick={() => handleDemoClick(account.email, account.password)}
                  disabled={loading}
                  sx={{
                    fontSize: '0.65rem',
                    py: 0.5,
                    px: 1,
                    borderRadius: 1,
                    textTransform: 'none',
                    borderColor: 'grey.300',
                    '&:hover': {
                      borderColor: 'primary.main',
                      bgcolor: 'primary.50',
                    },
                  }}
                >
                  {account.role}
                </Button>
              ))}
            </Stack>
          </Box>

          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Typography variant="caption" color="textSecondary">
              © {new Date().getFullYear()} Booking Room System. All rights reserved.
            </Typography>
          </Box>
        </Paper>
      </Container>

      {/* Snackbar untuk notifikasi */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert 
          severity={snackbar.severity} 
          variant="filled"
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Login;