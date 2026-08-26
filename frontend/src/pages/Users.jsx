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
  PersonAdd,
  CheckCircle,
  Cancel,
  Clear,
  People,
  Person,
  PersonOff,
  AdminPanelSettings,
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

const Users = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  
  // 🔥 STATE UNTUK SUMMARY CARDS
  const [allTotal, setAllTotal] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [inactiveCount, setInactiveCount] = useState(0);
  const [roleCounts, setRoleCounts] = useState({});
  
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [filters, setFilters] = useState({ search: '', role: '' });
  
  // 🔥 STATE UNTUK SEARCH (dengan debounce)
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 500);
  
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    role_id: '',
    division_id: '',
    phone: '',
    is_active: true,
  });

  // Default roles sebagai fallback
  const defaultRoles = [
    { id: 1, name: 'superadmin' },
    { id: 2, name: 'employee' },
    { id: 3, name: 'receptionist' },
    { id: 4, name: 'ga' }
  ];

  const [roles, setRoles] = useState(defaultRoles);
  const [divisions, setDivisions] = useState([]);

  // Fetch roles & divisions (hanya 1 kali)
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const token = localStorage.getItem('token');
        const rolesRes = await axios.get('/roles', { 
          headers: { Authorization: `Bearer ${token}` } 
        });
        const divisionsRes = await axios.get('/divisions', { 
          headers: { Authorization: `Bearer ${token}` } 
        });
        
        setRoles(rolesRes.data && rolesRes.data.length > 0 ? rolesRes.data : defaultRoles);
        setDivisions(divisionsRes.data || []);
      } catch (error) {
        console.error('Error fetching options:', error);
        setRoles(defaultRoles);
        setDivisions([]);
      }
    };
    fetchOptions();
  }, []);

  // 🔥 Fetch ALL data untuk count (tanpa pagination)
  const fetchAllCount = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/users', {
        params: { 
          page: 1, 
          limit: 9999,
          search: debouncedSearch.trim(),
          role: filters.role,
        },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        const allData = response.data.data || [];
        setAllTotal(allData.length);
        
        // Hitung aktif / tidak aktif
        const active = allData.filter(item => item.is_active === true || item.is_active === 1 || item.is_active === '1' || item.is_active === 'true').length;
        const inactive = allData.length - active;
        setActiveCount(active);
        setInactiveCount(inactive);
        
        // Hitung per role
        const roleCountsData = {};
        allData.forEach(item => {
          const roleName = item.role_name || 'unknown';
          if (roleCountsData[roleName]) {
            roleCountsData[roleName]++;
          } else {
            roleCountsData[roleName] = 1;
          }
        });
        setRoleCounts(roleCountsData);
      }
    } catch (error) {
      console.error('Error fetching all count:', error);
    }
  };

  // 🔥 Fetch data dengan pagination
  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      const response = await axios.get('/users', {
        params: { 
          page, 
          limit, 
          search: debouncedSearch.trim(),
          role: filters.role,
        },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setData(response.data.data || []);
        setTotal(response.data.pagination?.total || 0);
        
        // 🔥 Panggil fetchAllCount untuk mendapatkan total semua data
        await fetchAllCount();
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      showSnackbar('Gagal mengambil data', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 🔥 Effect untuk fetch data dengan debounce
  useEffect(() => {
    fetchData();
  }, [page, limit, debouncedSearch, filters.role]);

  // CRUD Operations
  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem('token');
      const url = selectedItem ? `/users/${selectedItem.id}` : '/users';
      const method = selectedItem ? 'put' : 'post';
      
      const submitData = { ...formData };
      if (selectedItem) delete submitData.password;
      
      const response = await axios[method](url, submitData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        showSnackbar(selectedItem ? 'User berhasil diupdate' : 'User berhasil ditambahkan', 'success');
        setOpenDialog(false);
        resetForm();
        fetchData();
      }
    } catch (error) {
      showSnackbar(error.response?.data?.message || 'Gagal menyimpan data', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Yakin ingin menghapus user ini?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showSnackbar('User berhasil dihapus', 'success');
      fetchData();
    } catch (error) {
      showSnackbar('Gagal menghapus data', 'error');
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`/users/${id}/toggle-status`, 
        { is_active: !currentStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showSnackbar(`User ${!currentStatus ? 'diaktifkan' : 'dinonaktifkan'}`, 'success');
      fetchData();
    } catch (error) {
      showSnackbar('Gagal mengubah status', 'error');
    }
  };

  // Export Excel
  const exportToExcel = () => {
    const exportData = data.map((item) => ({
      'Username': item.username,
      'Nama Lengkap': item.full_name,
      'Email': item.email,
      'Role': item.role_name || '-',
      'Divisi': item.division_name || '-',
      'Telepon': item.phone || '-',
      'Status': item.is_active ? 'Aktif' : 'Tidak Aktif',
      'Terdaftar': new Date(item.created_at).toLocaleDateString('id-ID'),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Users');
    
    const colWidths = [
      { wch: 15 }, { wch: 20 }, { wch: 25 }, { wch: 15 },
      { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 15 }
    ];
    ws['!cols'] = colWidths;
    
    XLSX.writeFile(wb, `users_${new Date().toISOString().split('T')[0]}.xlsx`);
    showSnackbar('Excel berhasil diexport', 'success');
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      full_name: '',
      role_id: '',
      division_id: '',
      phone: '',
      is_active: true,
    });
    setSelectedItem(null);
  };

  const handleEdit = (item) => {
    setSelectedItem(item);
    setFormData({
      username: item.username,
      email: item.email,
      password: '',
      full_name: item.full_name,
      role_id: item.role_id || '',
      division_id: item.division_id || '',
      phone: item.phone || '',
      is_active: item.is_active,
    });
    setOpenDialog(true);
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setFilters({ search: '', role: '' });
    setPage(1);
  };

  const getRoleLabel = (roleName) => {
    if (!roleName) return '-';
    const roleMap = {
      'superadmin': 'Superadmin',
      'employee': 'Employee',
      'receptionist': 'Receptionist',
      'ga': 'GA'
    };
    return roleMap[roleName] || roleName;
  };

  const getRoleColor = (roleName) => {
    if (!roleName) return 'default';
    const colorMap = {
      'superadmin': 'error',
      'employee': 'primary',
      'receptionist': 'warning',
      'ga': 'info'
    };
    return colorMap[roleName] || 'default';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" fontWeight="bold">
          Kelola User
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
          <Button variant="contained" startIcon={<PersonAdd />} onClick={() => setOpenDialog(true)}>
            Tambah User
          </Button>
        </Stack>
      </Box>

      {/* 🔥 SUMMARY CARDS */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, borderLeft: '4px solid #1976d2', background: '#f5f9ff' }}>
            <Typography variant="body2" color="textSecondary">
              <People sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
              Total User
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
              <Person sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
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
              <PersonOff sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
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
              <AdminPanelSettings sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
              Role User
            </Typography>
            <Typography variant="body2" fontWeight="bold" color="#ff9800">
              {Object.entries(roleCounts).map(([role, count]) => (
                <Chip 
                  key={role} 
                  label={`${getRoleLabel(role)}: ${count}`} 
                  size="small" 
                  color={getRoleColor(role)}
                  sx={{ mr: 0.5, mb: 0.5 }}
                />
              ))}
              {Object.keys(roleCounts).length === 0 && '-'}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {Object.keys(roleCounts).length} role terdaftar
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size="small"
              label="Cari User"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Ketik nama lengkap, username, atau email..."
              helperText={searchInput ? `🔍 Mencari: "${searchInput}"` : 'Cari berdasarkan Nama, Username, atau Email'}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
                endAdornment: searchInput && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchInput('')}>
                      <Clear />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Filter Role</InputLabel>
              <Select
                value={filters.role}
                onChange={(e) => setFilters({ ...filters, role: e.target.value })}
                label="Filter Role"
              >
                <MenuItem value="">Semua Role</MenuItem>
                {roles.map((r) => (
                  <MenuItem key={r.id} value={r.id}>
                    {getRoleLabel(r.name)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={2}>
            <Button 
              fullWidth 
              variant="outlined" 
              onClick={handleClearFilters}
              startIcon={<Refresh />}
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
              <TableCell>Username</TableCell>
              <TableCell>Nama Lengkap</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Divisi</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">Aksi</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <Typography color="textSecondary">
                    {searchInput ? `Tidak ada hasil untuk "${searchInput}"` : 'Belum ada data user'}
                  </Typography>
                  {(searchInput || filters.role) && (
                    <Button size="small" onClick={handleClearFilters} sx={{ mt: 1 }}>
                      Hapus filter
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              data.map((item, index) => (
                <TableRow key={item.id} hover>
                  <TableCell>{(page - 1) * limit + index + 1}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {item.username}
                    </Typography>
                  </TableCell>
                  <TableCell>{item.full_name}</TableCell>
                  <TableCell>{item.email}</TableCell>
                  <TableCell>
                    <Chip 
                      label={getRoleLabel(item.role_name)} 
                      size="small" 
                      color={getRoleColor(item.role_name)}
                    />
                  </TableCell>
                  <TableCell>{item.division_name || '-'}</TableCell>
                  <TableCell>
                    <Chip
                      label={item.is_active ? 'Aktif' : 'Tidak Aktif'}
                      color={item.is_active ? 'success' : 'error'}
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
                      <Tooltip title={item.is_active ? 'Nonaktifkan' : 'Aktifkan'}>
                        <IconButton
                          size="small"
                          color={item.is_active ? 'warning' : 'success'}
                          onClick={() => handleToggleStatus(item.id, item.is_active)}
                        >
                          {item.is_active ? <Cancel /> : <CheckCircle />}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Hapus">
                        <IconButton 
                          size="small" 
                          color="error" 
                          onClick={() => handleDelete(item.id)}
                          disabled={item.id === user?.id}
                        >
                          <Delete />
                        </IconButton>
                      </Tooltip>
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
          Menampilkan {data.length} dari {allTotal} user
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
            {selectedItem ? 'Edit User' : 'Tambah User Baru'}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Nama Lengkap"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Telepon"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Role</InputLabel>
                  <Select
                    value={formData.role_id}
                    onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                    label="Role"
                    required
                  >
                    {roles.map((r) => (
                      <MenuItem key={r.id} value={r.id}>
                        {getRoleLabel(r.name)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Divisi</InputLabel>
                  <Select
                    value={formData.division_id}
                    onChange={(e) => setFormData({ ...formData, division_id: e.target.value })}
                    label="Divisi"
                  >
                    <MenuItem value="">Tidak Ada</MenuItem>
                    {divisions.map((d) => (
                      <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              {!selectedItem && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    helperText="Minimal 8 karakter"
                  />
                </Grid>
              )}
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
            disabled={!formData.username || !formData.full_name || !formData.email || (!selectedItem && !formData.password)}
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

export default Users;