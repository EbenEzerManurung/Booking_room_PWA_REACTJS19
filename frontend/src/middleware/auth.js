const jwt = require('jsonwebtoken');
const db = require('../config/database');

const authenticate = async (req, res, next) => {
    try {
        // Check session first
        if (req.session && req.session.userId) {
            const [users] = await db.query(
                'SELECT u.*, r.name as role_name, d.name as division_name FROM users u LEFT JOIN roles r ON u.role_id = r.id LEFT JOIN divisions d ON u.division_id = d.id WHERE u.id = ? AND u.is_active = 1',
                [req.session.userId]
            );
            
            if (users.length > 0) {
                req.user = users[0];
                return next();
            }
        }

        // Check JWT token
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const [users] = await db.query(
            'SELECT u.*, r.name as role_name, d.name as division_name FROM users u LEFT JOIN roles r ON u.role_id = r.id LEFT JOIN divisions d ON u.division_id = d.id WHERE u.id = ? AND u.is_active = 1',
            [decoded.id]
        );

        if (users.length === 0) {
            return res.status(401).json({ message: 'User not found or inactive' });
        }

        req.user = users[0];
        req.session.userId = users[0].id;
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid token' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expired' });
        }
        console.error('Auth error:', error);
        res.status(500).json({ message: 'Authentication error' });
    }
};

const authorize = (roles = []) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const userRole = req.user.role_name?.toLowerCase();
        
        if (roles.length > 0 && !roles.includes(userRole)) {
            return res.status(403).json({
                message: 'Forbidden: Insufficient permissions',
                required: roles,
                yourRole: userRole,
            });
        }

        next();
    };
};

const hasPermission = (permissions = []) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // Superadmin has all permissions
        if (req.user.role_name?.toLowerCase() === 'superadmin') {
            return next();
        }

        // Check specific permissions (implement as needed)
        // This is a placeholder for granular permissions
        next();
    };
};

module.exports = { authenticate, authorize, hasPermission };