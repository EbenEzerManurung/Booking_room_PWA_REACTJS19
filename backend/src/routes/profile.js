const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// ============================================
// UPDATE PROFILE (untuk user sendiri)
// ============================================
router.put('/', authenticate, [
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

        console.log('📝 Updating profile for user:', req.user.username);

        // Check if email already used by other user
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

        console.log('✅ Profile updated for:', req.user.username);

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

        console.log('🔐 Changing password for user:', req.user.username);

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

        console.log('✅ Password changed for:', req.user.username);

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