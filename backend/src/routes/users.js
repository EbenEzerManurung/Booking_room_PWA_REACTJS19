const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { exportToExcel } = require('../utils/excel');

const router = express.Router();

// ============================================
// GET ALL ROLES
// ============================================
router.get('/roles', authenticate, async (req, res) => {
    try {
        const [roles] = await db.query('SELECT * FROM roles ORDER BY id');
        res.json(roles);
    } catch (error) {
        console.error('Error fetching roles:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ============================================
// GET ALL DIVISIONS
// ============================================
router.get('/divisions', authenticate, async (req, res) => {
    try {
        const [divisions] = await db.query('SELECT * FROM divisions ORDER BY name');
        res.json(divisions);
    } catch (error) {
        console.error('Error fetching divisions:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ============================================
// GET ALL USERS (with pagination, filter, search)
// ============================================
router.get('/', authenticate, authorize(['superadmin']), async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search = '',
            role = '',
            division = '',
            status = '',
            sortBy = 'created_at',
            sortOrder = 'DESC',
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);

        let query = `
            SELECT u.*, r.name as role_name, d.name as division_name
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            LEFT JOIN divisions d ON u.division_id = d.id
            WHERE 1=1
        `;

        const params = [];

        if (search && search.trim() !== '') {
            const searchTerm = search.trim();
            query += ` AND (
                u.username LIKE ? OR 
                u.full_name LIKE ? OR 
                u.email LIKE ? OR 
                u.phone LIKE ?
            )`;
            const pattern = `%${searchTerm}%`;
            params.push(pattern, pattern, pattern, pattern);
        }

        if (role) {
            query += ` AND u.role_id = ?`;
            params.push(role);
        }

        if (division) {
            query += ` AND u.division_id = ?`;
            params.push(division);
        }

        if (status) {
            query += ` AND u.is_active = ?`;
            params.push(status === 'active' ? 1 : 0);
        }

        // Get total count
        const countQuery = query.replace(
            /SELECT u\.\*, r\.name as role_name, d\.name as division_name FROM users u LEFT JOIN roles r ON u\.role_id = r\.id LEFT JOIN divisions d ON u\.division_id = d\.id/,
            'SELECT COUNT(*) as total FROM users u LEFT JOIN roles r ON u.role_id = r.id LEFT JOIN divisions d ON u.division_id = d.id'
        );

        const [countResult] = await db.query(countQuery, params);
        const total = countResult[0]?.total || 0;

        // Get data with pagination
        query += ` ORDER BY u.${sortBy} ${sortOrder}`;
        query += ` LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));

        const [users] = await db.query(query, params);

        users.forEach(user => delete user.password);

        res.json({
            success: true,
            data: users,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ============================================
// GET USER BY ID
// ============================================
router.get('/:id', authenticate, authorize(['superadmin']), async (req, res) => {
    try {
        const [users] = await db.query(
            `SELECT u.*, r.name as role_name, d.name as division_name 
             FROM users u 
             LEFT JOIN roles r ON u.role_id = r.id 
             LEFT JOIN divisions d ON u.division_id = d.id 
             WHERE u.id = ?`,
            [req.params.id]
        );

        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        delete users[0].password;
        res.json({ success: true, data: users[0] });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ============================================
// CREATE USER
// ============================================
router.post('/', authenticate, authorize(['superadmin']), [
    body('username').notEmpty().isLength({ min: 3 }),
    body('email').isEmail(),
    body('password').isLength({ min: 8 }),
    body('full_name').notEmpty(),
    body('role_id').isInt(),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { username, email, password, full_name, role_id, division_id, phone, is_active } = req.body;

        const [existing] = await db.query(
            'SELECT id FROM users WHERE username = ? OR email = ?',
            [username, email]
        );

        if (existing.length > 0) {
            return res.status(400).json({ message: 'Username atau email sudah digunakan' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const [result] = await db.query(
            `INSERT INTO users (username, email, password, full_name, role_id, division_id, phone, is_active, created_by) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [username, email, hashedPassword, full_name, role_id, division_id, phone, is_active !== undefined ? is_active : 1, req.user.id]
        );

        res.status(201).json({
            success: true,
            message: 'User berhasil ditambahkan',
            data: { id: result.insertId },
        });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ============================================
// UPDATE USER
// ============================================
router.put('/:id', authenticate, authorize(['superadmin']), [
    body('username').notEmpty().isLength({ min: 3 }),
    body('email').isEmail(),
    body('full_name').notEmpty(),
    body('role_id').isInt(),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const { username, email, full_name, role_id, division_id, phone, is_active } = req.body;

        const [existing] = await db.query('SELECT id FROM users WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ message: 'User tidak ditemukan' });
        }

        const [duplicate] = await db.query(
            'SELECT id FROM users WHERE (username = ? OR email = ?) AND id != ?',
            [username, email, id]
        );

        if (duplicate.length > 0) {
            return res.status(400).json({ message: 'Username atau email sudah digunakan' });
        }

        await db.query(
            `UPDATE users SET 
                username = ?, email = ?, full_name = ?, role_id = ?, 
                division_id = ?, phone = ?, is_active = ?, updated_at = NOW()
             WHERE id = ?`,
            [username, email, full_name, role_id, division_id, phone, is_active, id]
        );

        res.json({ success: true, message: 'User berhasil diupdate' });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ============================================
// DELETE USER
// ============================================
router.delete('/:id', authenticate, authorize(['superadmin']), async (req, res) => {
    try {
        const { id } = req.params;

        if (parseInt(id) === req.user.id) {
            return res.status(400).json({ message: 'Tidak bisa menghapus diri sendiri' });
        }

        const [existing] = await db.query('SELECT id FROM users WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ message: 'User tidak ditemukan' });
        }

        await db.query('DELETE FROM users WHERE id = ?', [id]);

        res.json({ success: true, message: 'User berhasil dihapus' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ============================================
// TOGGLE USER STATUS
// ============================================
router.patch('/:id/toggle-status', authenticate, authorize(['superadmin']), async (req, res) => {
    try {
        const { id } = req.params;
        const { is_active } = req.body;

        if (parseInt(id) === req.user.id) {
            return res.status(400).json({ message: 'Tidak bisa mengubah status sendiri' });
        }

        await db.query('UPDATE users SET is_active = ?, updated_at = NOW() WHERE id = ?', [is_active, id]);

        res.json({ success: true, message: `User ${is_active ? 'diaktifkan' : 'dinonaktifkan'}` });
    } catch (error) {
        console.error('Toggle user status error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ============================================
// EXPORT USERS TO EXCEL
// ============================================
router.get('/export/excel', authenticate, authorize(['superadmin']), async (req, res) => {
    try {
        const [users] = await db.query(
            `SELECT u.username, u.full_name, u.email, r.name as role, d.name as division,
                    u.phone, u.is_active, DATE(u.created_at) as joined_date
             FROM users u
             LEFT JOIN roles r ON u.role_id = r.id
             LEFT JOIN divisions d ON u.division_id = d.id
             ORDER BY u.created_at DESC`
        );

        const columns = [
            { header: 'Username', key: 'username' },
            { header: 'Nama Lengkap', key: 'full_name' },
            { header: 'Email', key: 'email' },
            { header: 'Role', key: 'role' },
            { header: 'Divisi', key: 'division' },
            { header: 'Telepon', key: 'phone' },
            { header: 'Status', key: 'is_active' },
            { header: 'Tanggal Bergabung', key: 'joined_date' },
        ];

        const buffer = await exportToExcel(users, columns, 'Users');

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=users_${Date.now()}.xlsx`);
        res.send(buffer);
    } catch (error) {
        console.error('Export users error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ============================================
// UPDATE PROFILE (untuk user sendiri)
// ============================================
router.put('/profile', authenticate, [
    body('full_name').notEmpty().withMessage('Nama lengkap wajib diisi'),
    body('email').isEmail().withMessage('Email tidak valid'),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false, 
                errors: errors.array() 
            });
        }

        const { full_name, email, phone } = req.body;
        const user_id = req.user.id;

        const [duplicate] = await db.query(
            'SELECT id FROM users WHERE email = ? AND id != ?',
            [email, user_id]
        );

        if (duplicate.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email sudah digunakan oleh user lain' 
            });
        }

        await db.query(
            `UPDATE users SET 
                full_name = ?, 
                email = ?, 
                phone = ?, 
                updated_at = NOW()
             WHERE id = ?`,
            [full_name, email, phone || '', user_id]
        );

        const [updated] = await db.query(
            `SELECT u.*, r.name as role_name, d.name as division_name 
             FROM users u 
             LEFT JOIN roles r ON u.role_id = r.id 
             LEFT JOIN divisions d ON u.division_id = d.id 
             WHERE u.id = ?`,
            [user_id]
        );

        delete updated[0].password;

        res.json({
            success: true,
            message: 'Profile berhasil diupdate',
            data: updated[0]
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
});

// ============================================
// CHANGE PASSWORD
// ============================================
router.put('/change-password', authenticate, [
    body('current_password').notEmpty().withMessage('Password saat ini wajib diisi'),
    body('new_password').isLength({ min: 6 }).withMessage('Password baru minimal 6 karakter'),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false, 
                errors: errors.array() 
            });
        }

        const { current_password, new_password } = req.body;
        const user_id = req.user.id;

        const [user] = await db.query(
            'SELECT password FROM users WHERE id = ?',
            [user_id]
        );

        if (user.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'User tidak ditemukan' 
            });
        }

        const isMatch = await bcrypt.compare(current_password, user[0].password);
        if (!isMatch) {
            return res.status(400).json({ 
                success: false, 
                message: 'Password saat ini salah' 
            });
        }

        const hashedPassword = await bcrypt.hash(new_password, 10);

        await db.query(
            'UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?',
            [hashedPassword, user_id]
        );

        res.json({
            success: true,
            message: 'Password berhasil diubah'
        });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
});

module.exports = router;