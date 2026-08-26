import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Box, Toolbar } from '@mui/material';
import Navbar from '../common/Navbar';
import Sidebar from '../common/Sidebar';

const MainLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <Navbar onMenuClick={handleDrawerToggle} />
      <Sidebar 
        open={mobileOpen} 
        onClose={handleDrawerToggle} 
        variant="temporary" 
      />
      <Sidebar variant="permanent" />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - 240px)` },
          mt: '64px',
          bgcolor: '#f5f7fa',
          minHeight: 'calc(100vh - 64px)',
        }}
      >
        <Toolbar /> {/* Spacer for fixed navbar */}
        <Outlet />
      </Box>
    </Box>
  );
};

export default MainLayout;