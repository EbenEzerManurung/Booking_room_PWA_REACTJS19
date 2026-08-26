const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// ============================================
// LOGIN
// ============================================
router.post('/login', [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;
        console.log('🔐 ===== LOGIN ATTEMPT =====');
        console.log('📧 Email:', email);

        // Query user dengan JOIN roles dan divisions
        const [users] = await db.query(
            `SELECT u.*, 
                    r.name as role_name, 
                    d.name as division_name 
             FROM users u 
             LEFT JOIN roles r ON u.role_id = r.id 
             LEFT JOIN divisions d ON u.division_id = d.id 
             WHERE u.email = ? AND u.is_active = 1`,
            [email]
        );

        console.log('📊 Users found:', users.length);

        if (users.length === 0) {
            console.log('❌ User not found');
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const user = users[0];
        console.log('👤 User found:', user.username);
        console.log('🔑 Role:', user.role_name);
        console.log('🏢 Division:', user.division_name || 'None');

        // Verifikasi password
        const isValidPassword = await bcrypt.compare(password, user.password);
        console.log('✅ Password valid:', isValidPassword);

        if (!isValidPassword) {
            console.log('❌ Invalid password');
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Update last login
        await db.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

        // Generate JWT
        const token = jwt.sign(
            { 
                id: user.id, 
                email: user.email, 
                role: user.role_name 
            },
            process.env.JWT_SECRET || 'your_jwt_secret_key_here',
            { expiresIn: process.env.JWT_EXPIRE || '7d' }
        );

        // Set session
        req.session.userId = user.id;

        // Hapus password dari response
        delete user.password;

        // Response dengan data lengkap
        const responseData = {
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                full_name: user.full_name,
                role_id: user.role_id,
                role_name: user.role_name || 'unknown',
                division_id: user.division_id,
                division_name: user.division_name || null,
                phone: user.phone || '',
                is_active: user.is_active,
                last_login: user.last_login,
                created_at: user.created_at
            }
        };

        console.log('✅ Login successful for:', email);
        console.log('📤 Response user:', {
            id: responseData.user.id,
            username: responseData.user.username,
            role: responseData.user.role_name,
            division: responseData.user.division_name
        });

        res.json(responseData);

    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Login failed: ' + error.message 
        });
    }
});

// ============================================
// LOGOUT
// ============================================
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ message: 'Logout failed' });
        }
        res.json({ success: true, message: 'Logged out successfully' });
    });
});

// ============================================
// GET CURRENT USER
// ============================================
router.get('/me', authenticate, async (req, res) => {
    try {
        const [users] = await db.query(
            `SELECT u.*, 
                    r.name as role_name, 
                    d.name as division_name 
             FROM users u 
             LEFT JOIN roles r ON u.role_id = r.id 
             LEFT JOIN divisions d ON u.division_id = d.id 
             WHERE u.id = ?`,
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const user = users[0];
        delete user.password;

        res.json({
            id: user.id,
            username: user.username,
            email: user.email,
            full_name: user.full_name,
            role_id: user.role_id,
            role_name: user.role_name || 'unknown',
            division_id: user.division_id,
            division_name: user.division_name || null,
            phone: user.phone || '',
            is_active: user.is_active,
            last_login: user.last_login,
            created_at: user.created_at
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;