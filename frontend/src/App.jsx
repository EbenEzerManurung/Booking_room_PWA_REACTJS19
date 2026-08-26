import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Ruangan from './pages/Ruangan';
import Bookings from './pages/Bookings';
import Approval from './pages/Approval';
import QRScanner from './pages/QRScanner';
import Reports from './pages/Reports';

// Components
import PrivateRoute from './components/common/PrivateRoute';
import MainLayout from './components/layouts/MainLayout';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<PrivateRoute><MainLayout /></PrivateRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="users" element={<PrivateRoute roles={['superadmin']}><Users /></PrivateRoute>} />
        <Route path="ruangan" element={<PrivateRoute roles={['superadmin', 'receptionist']}><Ruangan /></PrivateRoute>} />
        <Route path="bookings" element={<PrivateRoute><Bookings /></PrivateRoute>} />
        <Route path="approval" element={<PrivateRoute roles={['superadmin', 'ga']}><Approval /></PrivateRoute>} />
        <Route path="qr-scanner" element={<PrivateRoute><QRScanner /></PrivateRoute>} />
        <Route path="reports" element={<PrivateRoute roles={['superadmin']}><Reports /></PrivateRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;