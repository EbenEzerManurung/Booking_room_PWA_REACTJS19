import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Badge,
  Menu,
  MenuItem,
  Avatar,
  Box,
  Tooltip,
  Divider,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Snackbar,
  Alert,
  CircularProgress,
  Tab,
  Tabs,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Notifications as NotificationsIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
  Close as CloseIcon,
  Lock as LockIcon,
  Edit as EditIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Pending as PendingIcon,
} from '@mui/icons-material';
import axios from '../../utils/axios';

const Navbar = ({ onMenuClick }) => {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const [notificationAnchor, setNotificationAnchor] = useState(null);
  const [openProfileDialog, setOpenProfileDialog] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [profileLoaded, setProfileLoaded] = useState(false);
  
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    email: '',
    phone: '',
  });
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  // FETCH NOTIFICATIONS
  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const response = await axios.get('/bookings', {
        params: { status: 'pending', limit: 100 },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        const pendingBookings = response.data.data || [];
        const notifs = pendingBookings.map(booking => ({
          id: booking.id,
          title: `Booking Pending: ${booking.ruangan_name}`,
          message: `Booking ruangan ${booking.ruangan_name} pada ${booking.booking_date} pukul ${booking.start_time} - ${booking.end_time}`,
          time: new Date(booking.created_at).toLocaleString('id-ID'),
          type: 'pending',
          data: booking,
        }));
        setNotifications(notifs);
        setUnreadCount(notifs.length);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  // FETCH PROFILE
  const fetchProfile = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        setLoading(false);
        return;
      }
      
      if (user) {
        setProfileForm({
          full_name: user.full_name || '',
          email: user.email || '',
          phone: user.phone || '',
        });
        setProfileLoaded(true);
        setLoading(false);
        return;
      }

      const response = await axios.get('/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      let userData = response.data;
      if (response.data.success) {
        userData = response.data.data || response.data;
      }
      
      if (userData) {
        setProfileForm({
          full_name: userData.full_name || '',
          email: userData.email || '',
          phone: userData.phone || '',
        });
        setProfileLoaded(true);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setProfileForm({
            full_name: parsedUser.full_name || '',
            email: parsedUser.email || '',
            phone: parsedUser.phone || '',
          });
          setProfileLoaded(true);
        } catch (e) {}
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    if (openProfileDialog && !profileLoaded) {
      fetchProfile();
    }
  }, [openProfileDialog]);

  useEffect(() => {
    if (user && !openProfileDialog) {
      setProfileForm({
        full_name: user.full_name || '',
        email: user.email || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationOpen = (event) => {
    setNotificationAnchor(event.currentTarget);
    setUnreadCount(0);
  };

  const handleNotificationClose = () => {
    setNotificationAnchor(null);
  };

  const handleLogout = async () => {
    handleMenuClose();
    await logout();
    navigate('/login');
  };

  const handleOpenProfile = () => {
    handleMenuClose();
    setProfileLoaded(false);
    setOpenProfileDialog(true);
    setTabValue(0);
    fetchProfile();
  };

  const handleCloseProfile = () => {
    setOpenProfileDialog(false);
    setProfileLoaded(false);
    resetForms();
  };

  const resetForms = () => {
    setProfileForm({
      full_name: '',
      email: '',
      phone: '',
    });
    setPasswordForm({
      current_password: '',
      new_password: '',
      confirm_password: '',
    });
  };

  // UPDATE PROFILE - ENDPOINT /profile
  const handleUpdateProfile = async () => {
    if (!profileForm.full_name || !profileForm.email) {
      showSnackbar('Nama lengkap dan email wajib diisi', 'error');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        showSnackbar('Sesi habis, silakan login ulang', 'error');
        setLoading(false);
        return;
      }

      const response = await axios.put('/profile', {
        full_name: profileForm.full_name,
        email: profileForm.email,
        phone: profileForm.phone || '',
      }, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        showSnackbar('Profile berhasil diupdate!', 'success');
        
        const updatedUser = response.data.data || response.data;
        if (updateUser && updatedUser) {
          updateUser(updatedUser);
        }
        
        if (updatedUser) {
          localStorage.setItem('user', JSON.stringify(updatedUser));
        }
        
        setProfileForm({
          full_name: updatedUser.full_name || '',
          email: updatedUser.email || '',
          phone: updatedUser.phone || '',
        });
        setProfileLoaded(true);
        
        setTimeout(() => {
          setOpenProfileDialog(false);
        }, 1500);
      } else {
        showSnackbar(response.data.message || 'Gagal update profile', 'error');
      }
    } catch (error) {
      console.error('Update profile error:', error);
      
      if (error.response?.status === 403) {
        showSnackbar('Anda tidak memiliki izin untuk mengubah profile', 'error');
      } else if (error.response?.status === 401) {
        showSnackbar('Sesi habis, silakan login ulang', 'error');
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else {
        showSnackbar(error.response?.data?.message || 'Gagal update profile', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  // CHANGE PASSWORD - ENDPOINT /profile/change-password
  const handleChangePassword = async () => {
    if (!passwordForm.current_password || !passwordForm.new_password || !passwordForm.confirm_password) {
      showSnackbar('Semua field password wajib diisi', 'error');
      return;
    }

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      showSnackbar('Password baru dan konfirmasi password tidak sama', 'error');
      return;
    }

    if (passwordForm.new_password.length < 6) {
      showSnackbar('Password minimal 6 karakter', 'error');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        showSnackbar('Sesi habis, silakan login ulang', 'error');
        setLoading(false);
        return;
      }

      const response = await axios.put('/profile/change-password', {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      }, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        showSnackbar('Password berhasil diubah!', 'success');
        setPasswordForm({
          current_password: '',
          new_password: '',
          confirm_password: '',
        });
        setTimeout(() => {
          setOpenProfileDialog(false);
        }, 1500);
      } else {
        showSnackbar(response.data.message || 'Gagal ubah password', 'error');
      }
    } catch (error) {
      console.error('Change password error:', error);
      
      if (error.response?.status === 403) {
        showSnackbar('Anda tidak memiliki izin untuk mengubah password', 'error');
      } else if (error.response?.status === 401) {
        showSnackbar('Sesi habis, silakan login ulang', 'error');
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else {
        showSnackbar(error.response?.data?.message || 'Gagal ubah password', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const getStatusIcon = (type) => {
    if (type === 'pending') return <PendingIcon color="warning" />;
    if (type === 'confirmed') return <CheckCircleIcon color="success" />;
    if (type === 'rejected') return <CancelIcon color="error" />;
    return <PendingIcon />;
  };

  const handleNotificationClick = (notification) => {
    handleNotificationClose();
    if (notification.data) {
      navigate('/approval');
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.charAt(0).toUpperCase();
  };

  return (
    <>
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          bgcolor: 'background.paper',
          color: 'text.primary',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}
      >
        <Toolbar>
          <IconButton
            edge="start"
            onClick={onMenuClick}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 0, mr: 4 }}>
            <Avatar src="/favicon.png" alt="Logo" sx={{ width: 32, height: 32 }} />
            <Typography variant="h6" noWrap>
              Booking Room System
            </Typography>
          </Box>

          <Box sx={{ flexGrow: 1 }} />

          <Stack direction="row" spacing={1} alignItems="center">
            <Tooltip title="Notifications">
              <IconButton onClick={handleNotificationOpen}>
                <Badge badgeContent={unreadCount} color="error">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Tooltip>

            <Tooltip title="Profile">
              <IconButton onClick={handleMenuOpen}>
                <Avatar
                  sx={{
                    width: 36,
                    height: 36,
                    bgcolor: 'primary.main',
                    fontSize: '0.875rem',
                  }}
                >
                  {getInitials(user?.full_name)}
                </Avatar>
              </IconButton>
            </Tooltip>
          </Stack>

          {/* Profile Menu */}
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            PaperProps={{
              sx: {
                mt: 1,
                minWidth: 240,
                borderRadius: 2,
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              },
            }}
          >
            <Box sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Typography variant="subtitle1" fontWeight="bold">
                {user?.full_name || 'User'}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {user?.email || ''}
              </Typography>
              <Typography variant="caption" display="block" color="textSecondary">
                {user?.role_name || 'Role'}
                {user?.division_name && ` • ${user.division_name}`}
              </Typography>
            </Box>
            <Divider />
            <MenuItem onClick={handleOpenProfile}>
              <PersonIcon sx={{ mr: 2 }} /> Edit Profile
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
              <LogoutIcon sx={{ mr: 2 }} /> Logout
            </MenuItem>
          </Menu>

          {/* Notification Menu */}
          <Menu
            anchorEl={notificationAnchor}
            open={Boolean(notificationAnchor)}
            onClose={handleNotificationClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            PaperProps={{
              sx: {
                mt: 1,
                width: 380,
                maxHeight: 400,
                borderRadius: 2,
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              },
            }}
          >
            <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
              <Typography variant="subtitle1" fontWeight="bold">
                Notifications
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {notifications.length} pending approval
              </Typography>
            </Box>
            <Box sx={{ overflowY: 'auto', maxHeight: 300 }}>
              {notifications.length === 0 ? (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="body2" color="textSecondary">
                    No pending notifications
                  </Typography>
                </Box>
              ) : (
                notifications.map((notif) => (
                  <MenuItem
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    sx={{ 
                      py: 1.5, 
                      px: 2,
                      borderBottom: '1px solid #f5f5f5',
                      '&:hover': { bgcolor: 'grey.50' }
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'warning.50', color: 'warning.main' }}>
                        {getStatusIcon(notif.type)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography variant="body2" fontWeight="medium">
                          {notif.title}
                        </Typography>
                      }
                      secondary={
                        <>
                          <Typography variant="caption" color="textSecondary" display="block">
                            {notif.message}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {notif.time}
                          </Typography>
                        </>
                      }
                    />
                  </MenuItem>
                ))
              )}
            </Box>
            <Divider />
            <Box sx={{ p: 1, textAlign: 'center' }}>
              <Button size="small" onClick={() => { handleNotificationClose(); navigate('/approval'); }}>
                View All Approvals
              </Button>
            </Box>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Edit Profile Dialog */}
      <Dialog 
        open={openProfileDialog} 
        onClose={handleCloseProfile} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" fontWeight="bold">
              Edit Profile
            </Typography>
            <IconButton onClick={handleCloseProfile}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <Divider />
        <DialogContent>
          <Tabs
            value={tabValue}
            onChange={(e, v) => setTabValue(v)}
            sx={{ mb: 3, borderBottom: '1px solid #e0e0e0' }}
          >
            <Tab label="Profile" icon={<EditIcon />} iconPosition="start" />
            <Tab label="Password" icon={<LockIcon />} iconPosition="start" />
          </Tabs>

          {tabValue === 0 && (
            <Box sx={{ pt: 1 }}>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <>
                  <TextField
                    fullWidth
                    label="Nama Lengkap *"
                    value={profileForm.full_name || ''}
                    onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                    margin="normal"
                    required
                  />
                  <TextField
                    fullWidth
                    label="Email *"
                    type="email"
                    value={profileForm.email || ''}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    margin="normal"
                    required
                  />
                  <TextField
                    fullWidth
                    label="Telepon"
                    value={profileForm.phone || ''}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    margin="normal"
                  />
                </>
              )}
            </Box>
          )}

          {tabValue === 1 && (
            <Box sx={{ pt: 1 }}>
              <TextField
                fullWidth
                label="Password Saat Ini *"
                type="password"
                value={passwordForm.current_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                margin="normal"
                required
              />
              <TextField
                fullWidth
                label="Password Baru *"
                type="password"
                value={passwordForm.new_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                margin="normal"
                required
                helperText="Minimal 6 karakter"
              />
              <TextField
                fullWidth
                label="Konfirmasi Password Baru *"
                type="password"
                value={passwordForm.confirm_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                margin="normal"
                required
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={handleCloseProfile} variant="outlined">
            Batal
          </Button>
          <Button
            variant="contained"
            onClick={tabValue === 0 ? handleUpdateProfile : handleChangePassword}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : (tabValue === 0 ? 'Update Profile' : 'Ubah Password')}
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
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default Navbar;