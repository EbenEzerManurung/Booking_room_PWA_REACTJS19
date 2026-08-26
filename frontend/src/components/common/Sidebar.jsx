import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Toolbar,
  Box,
  Typography,
  Divider,
  Avatar,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  MeetingRoom as MeetingRoomIcon,
  Bookmark as BookmarkIcon,
  CheckCircle as CheckCircleIcon,
  QrCodeScanner as QrCodeScannerIcon,
  BarChart as BarChartIcon,
} from '@mui/icons-material';

const drawerWidth = 240;

const menuItems = [
  { path: '/', label: 'Dashboard', icon: <DashboardIcon />, roles: ['superadmin', 'employee', 'receptionist', 'ga'] },
  { path: '/users', label: 'Kelola User', icon: <PeopleIcon />, roles: ['superadmin'] },
  { path: '/ruangan', label: 'Kelola Ruangan', icon: <MeetingRoomIcon />, roles: ['superadmin', 'receptionist'] },
  { path: '/bookings', label: 'Booking', icon: <BookmarkIcon />, roles: ['superadmin', 'employee', 'receptionist'] },
  { path: '/approval', label: 'Approval', icon: <CheckCircleIcon />, roles: ['superadmin', 'ga'] },
  { path: '/qr-scanner', label: 'Scan QR', icon: <QrCodeScannerIcon />, roles: ['superadmin', 'employee', 'receptionist', 'ga'] },
  { path: '/reports', label: 'Reports', icon: <BarChartIcon />, roles: ['superadmin'] },
];

const Sidebar = ({ open, onClose, variant = 'permanent' }) => {
  const { user } = useAuth();
  const location = useLocation();

  const filteredMenu = menuItems.filter(item =>
    item.roles.includes(user?.role_name?.toLowerCase())
  );

  const drawerContent = (
    <Box>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          Booking Room System
        </Typography>
      </Toolbar>
      <Divider />
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar sx={{ bgcolor: 'primary.main' }}>
          {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
        </Avatar>
        <Box>
          <Typography variant="subtitle2">{user?.full_name}</Typography>
          <Typography variant="caption" color="textSecondary">
            {user?.role_name}
          </Typography>
        </Box>
      </Box>
      <Divider />
      <List>
        {filteredMenu.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              component={Link}
              to={item.path}
              onClick={onClose}
              selected={location.pathname === item.path}
              sx={{
                '&.Mui-selected': {
                  backgroundColor: 'primary.main',
                  color: 'white',
                  '&:hover': { backgroundColor: 'primary.dark' },
                  '& .MuiListItemIcon-root': { color: 'white' },
                },
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  if (variant === 'temporary') {
    return (
      <Drawer
        variant="temporary"
        open={open}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
        }}
      >
        {drawerContent}
      </Drawer>
    );
  }

  return (
    <Drawer
      variant="permanent"
      sx={{
        display: { xs: 'none', sm: 'block' },
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box' },
      }}
      open
    >
      {drawerContent}
    </Drawer>
  );
};

export default Sidebar;