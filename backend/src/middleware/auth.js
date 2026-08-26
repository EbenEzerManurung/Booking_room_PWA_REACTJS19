const jwt = require('jsonwebtoken');
const db = require('../config/database');

const authenticate = async (req, res, next) => {
    try {
        console.log('🔐 ===== AUTHENTICATE =====');
        
        // Check session first
        if (req.session && req.session.userId) {
            console.log('📋 Session found:', req.session.userId);
            
            const [users] = await db.query(
                `SELECT u.*, r.name as role_name, d.name as division_name 
                 FROM users u 
                 LEFT JOIN roles r ON u.role_id = r.id 
                 LEFT JOIN divisions d ON u.division_id = d.id 
                 WHERE u.id = ? AND u.is_active = 1`,
                [req.session.userId]
            );
            
            if (users.length > 0) {
                req.user = users[0];
                console.log('✅ User authenticated via session:', req.user.username);
                console.log('👤 Role:', req.user.role_name);
                return next();
            }
        }

        // Check JWT token
        const authHeader = req.headers.authorization;
        console.log('📋 Auth header:', authHeader ? 'Present' : 'Missing');
        
        const token = authHeader?.split(' ')[1];
        if (!token) {
            console.log('❌ No token provided');
            return res.status(401).json({ message: 'No token provided' });
        }

        console.log('🔑 Token received, verifying...');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_here');
        console.log('✅ Token verified for user ID:', decoded.id);

        const [users] = await db.query(
            `SELECT u.*, r.name as role_name, d.name as division_name 
             FROM users u 
             LEFT JOIN roles r ON u.role_id = r.id 
             LEFT JOIN divisions d ON u.division_id = d.id 
             WHERE u.id = ? AND u.is_active = 1`,
            [decoded.id]
        );

        if (users.length === 0) {
            console.log('❌ User not found or inactive');
            return res.status(401).json({ message: 'User not found or inactive' });
        }

        req.user = users[0];
        req.session.userId = users[0].id;
        
        console.log('✅ User authenticated via token:', req.user.username);
        console.log('👤 Role:', req.user.role_name);
        console.log('🏢 Division:', req.user.division_name || 'None');
        
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            console.log('❌ Invalid token:', error.message);
            return res.status(401).json({ message: 'Invalid token' });
        }
        if (error.name === 'TokenExpiredError') {
            console.log('❌ Token expired');
            return res.status(401).json({ message: 'Token expired' });
        }
        console.error('❌ Auth error:', error);
        res.status(500).json({ message: 'Authentication error' });
    }
};

const authorize = (roles = []) => {
    return (req, res, next) => {
        if (!req.user) {
            console.log('❌ No user in request');
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const userRole = req.user.role_name?.toLowerCase();
        console.log('🔐 ===== AUTHORIZE =====');
        console.log('👤 User:', req.user.username);
        console.log('🎭 Role:', userRole);
        console.log('📋 Required roles:', roles);

        // SUPERADMIN bisa akses SEMUA (role: superadmin)
        if (userRole === 'superadmin') {
            console.log('✅ Superadmin granted access');
            return next();
        }

        // Jika roles kosong, berarti semua role bisa akses
        if (roles.length === 0) {
            console.log('✅ No roles required, access granted');
            return next();
        }

        // Cek apakah user punya role yang dibutuhkan
        if (roles.includes(userRole)) {
            console.log('✅ Role authorized:', userRole);
            return next();
        }

        console.log('❌ Forbidden: Insufficient permissions');
        return res.status(403).json({
            success: false,
            message: 'Forbidden: Insufficient permissions',
            required: roles,
            yourRole: userRole,
        });
    };
};

module.exports = { authenticate, authorize };