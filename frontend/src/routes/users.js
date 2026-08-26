const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { exportToExcel } = require('../utils/excel');

const router = express.Router();

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
            SELECT u.*, r.name as role_name, d.name as division_name,
                   (SELECT COUNT(*) FROM bookings WHERE user_id = u.id) as total_bookings
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            LEFT JOIN divisions d ON u.division_id = d.id
            WHERE 1=1
        `;

        const params = [];

        if (search) {
            query += ` AND (u.username LIKE ? OR u.full_name LIKE ? OR u.email LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
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
            /SELECT u\.\*, r\.name as role_name, d\.name as division_name, \(SELECT COUNT\(\*\) FROM bookings WHERE user_id = u\.id\) as total_bookings FROM users u LEFT JOIN roles r ON u\.role_id = r\.id LEFT JOIN divisions d ON u\.division_id = d\.id/,
            'SELECT COUNT(*) as total FROM users u LEFT JOIN roles r ON u.role_id = r.id LEFT JOIN divisions d ON u.division_id = d.id'
        );

        const [countResult] = await db.query(countQuery, params);
        const total = countResult[0]?.total || 0;

        // Get data with pagination
        query += ` ORDER BY u.${sortBy} ${sortOrder}`;
        query += ` LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));

        const [users] = await db.query(query, params);

        // Remove passwords
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

        const { username, email, password, full_name, role_id, division_id, phone } = req.body;

        // Check if username or email exists
        const [existing] = await db.query(
            'SELECT id FROM users WHERE username = ? OR email = ?',
            [username, email]
        );

        if (existing.length > 0) {
            return res.status(400).json({ message: 'Username or email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const [result] = await db.query(
            `INSERT INTO users (username, email, password, full_name, role_id, division_id, phone, created_by) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [username, email, hashedPassword, full_name, role_id, division_id, phone, req.user.id]
        );

        res.status(201).json({
            success: true,
            message: 'User created successfully',
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

        // Check if user exists
        const [existing] = await db.query('SELECT id FROM users WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if username or email already used by other user
        const [duplicate] = await db.query(
            'SELECT id FROM users WHERE (username = ? OR email = ?) AND id != ?',
            [username, email, id]
        );

        if (duplicate.length > 0) {
            return res.status(400).json({ message: 'Username or email already exists' });
        }

        await db.query(
            `UPDATE users SET 
                username = ?, email = ?, full_name = ?, role_id = ?, 
                division_id = ?, phone = ?, is_active = ?, updated_at = NOW()
             WHERE id = ?`,
            [username, email, full_name, role_id, division_id, phone, is_active, id]
        );

        res.json({ success: true, message: 'User updated successfully' });
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

        // Prevent deleting self
        if (parseInt(id) === req.user.id) {
            return res.status(400).json({ message: 'Cannot delete yourself' });
        }

        const [existing] = await db.query('SELECT id FROM users WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        await db.query('DELETE FROM users WHERE id = ?', [id]);

        res.json({ success: true, message: 'User deleted successfully' });
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
            return res.status(400).json({ message: 'Cannot change your own status' });
        }

        await db.query('UPDATE users SET is_active = ?, updated_at = NOW() WHERE id = ?', [is_active, id]);

        res.json({ success: true, message: `User ${is_active ? 'activated' : 'deactivated'} successfully` });
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
            { header: 'Full Name', key: 'full_name' },
            { header: 'Email', key: 'email' },
            { header: 'Role', key: 'role' },
            { header: 'Division', key: 'division' },
            { header: 'Phone', key: 'phone' },
            { header: 'Status', key: 'is_active' },
            { header: 'Joined Date', key: 'joined_date' },
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

module.exports = router;