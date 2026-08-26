const express = require('express');
const QRCode = require('qrcode');
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { exportToExcel } = require('../utils/excel');

const router = express.Router();

// ============================================
// GET APPROVALS (pending bookings)
// ============================================
router.get('/', authenticate, authorize(['superadmin', 'ga']), async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', status = 'pending', sort = 'desc' } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let query = `
            SELECT b.*, r.name as ruangan_name, u.full_name as user_name,
                   u.division_id, d.name as division_name
            FROM bookings b
            JOIN ruangan r ON b.ruangan_id = r.id
            JOIN users u ON b.user_id = u.id
            LEFT JOIN divisions d ON u.division_id = d.id
            WHERE 1=1
        `;
        const params = [];

        if (status !== 'all') {
            query += ` AND b.status = ?`;
            params.push(status);
        }

        if (search) {
            query += ` AND (r.name LIKE ? OR b.purpose LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`);
        }

        // Get total count
        const countQuery = query.replace(
            /SELECT b\.\*, r\.name as ruangan_name, u\.full_name as user_name, u\.division_id, d\.name as division_name FROM bookings b JOIN ruangan r ON b\.ruangan_id = r\.id JOIN users u ON b\.user_id = u\.id LEFT JOIN divisions d ON u\.division_id = d\.id/,
            'SELECT COUNT(*) as total'
        );
        const [countResult] = await db.query(countQuery, params);
        const total = countResult[0]?.total || 0;

        query += ` ORDER BY b.created_at ${sort === 'desc' ? 'DESC' : 'ASC'}`;
        query += ` LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));

        const [bookings] = await db.query(query, params);

        // Get counts
        const [counts] = await db.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
                SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
            FROM bookings
        `);

        res.json({
            success: true,
            data: bookings,
            total: counts[0]?.total || 0,
            pendingCount: counts[0]?.pending || 0,
            confirmedCount: counts[0]?.confirmed || 0,
            rejectedCount: counts[0]?.rejected || 0,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Get approvals error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ============================================
// APPROVE BOOKING
// ============================================
router.patch('/:id/approve', authenticate, authorize(['superadmin', 'ga']), async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Check if booking exists
        const [booking] = await db.query(
            'SELECT * FROM bookings WHERE id = ?',
            [id]
        );

        if (booking.length === 0) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        if (booking[0].status !== 'pending') {
            return res.status(400).json({ message: 'Only pending bookings can be approved' });
        }

        // Generate QR Code
        const qrData = JSON.stringify({
            bookingId: id,
            room: booking[0].ruangan_id,
            date: booking[0].booking_date,
            time: `${booking[0].start_time} - ${booking[0].end_time}`,
            timestamp: new Date().toISOString(),
        });
        
        const qrCode = await QRCode.toDataURL(qrData);

        await db.query(
            `UPDATE bookings SET 
                status = 'confirmed', 
                approved_by = ?, 
                approved_at = NOW(), 
                qr_code = ?,
                qr_code_generated_at = NOW()
             WHERE id = ?`,
            [userId, qrCode, id]
        );

        const [updatedBooking] = await db.query(
            `SELECT b.*, r.name as ruangan_name, u.full_name as user_name
             FROM bookings b
             JOIN ruangan r ON b.ruangan_id = r.id
             JOIN users u ON b.user_id = u.id
             WHERE b.id = ?`,
            [id]
        );

        res.json({
            success: true,
            message: 'Booking approved successfully',
            data: updatedBooking[0],
            qr_code: qrCode,
        });
    } catch (error) {
        console.error('Approve booking error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ============================================
// REJECT BOOKING
// ============================================
router.patch('/:id/reject', authenticate, authorize(['superadmin', 'ga']), async (req, res) => {
    try {
        const { id } = req.params;
        const { comment } = req.body;

        if (!comment || comment.trim() === '') {
            return res.status(400).json({ message: 'Rejection comment is required' });
        }

        // Check if booking exists
        const [booking] = await db.query(
            'SELECT * FROM bookings WHERE id = ?',
            [id]
        );

        if (booking.length === 0) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        if (booking[0].status !== 'pending') {
            return res.status(400).json({ message: 'Only pending bookings can be rejected' });
        }

        await db.query(
            `UPDATE bookings SET 
                status = 'rejected', 
                approved_by = ?, 
                approved_at = NOW(),
                rejection_comment = ?
             WHERE id = ?`,
            [req.user.id, comment, id]
        );

        res.json({
            success: true,
            message: 'Booking rejected successfully',
        });
    } catch (error) {
        console.error('Reject booking error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ============================================
// EXPORT APPROVALS TO EXCEL
// ============================================
router.get('/export/excel', authenticate, authorize(['superadmin', 'ga']), async (req, res) => {
    try {
        const { status = 'all' } = req.query;
        
        let query = `
            SELECT r.name as room, b.booking_date as date, b.start_time, b.end_time,
                   b.purpose, b.status, u.full_name as requested_by,
                   d.name as division, b.rejection_comment,
                   DATE(b.created_at) as created_date
            FROM bookings b
            JOIN ruangan r ON b.ruangan_id = r.id
            JOIN users u ON b.user_id = u.id
            LEFT JOIN divisions d ON u.division_id = d.id
            WHERE 1=1
        `;
        const params = [];

        if (status !== 'all') {
            query += ` AND b.status = ?`;
            params.push(status);
        }

        query += ' ORDER BY b.created_at DESC';

        const [bookings] = await db.query(query, params);

        const columns = [
            { header: 'Room', key: 'room' },
            { header: 'Date', key: 'date' },
            { header: 'Start Time', key: 'start_time' },
            { header: 'End Time', key: 'end_time' },
            { header: 'Purpose', key: 'purpose' },
            { header: 'Status', key: 'status' },
            { header: 'Requested By', key: 'requested_by' },
            { header: 'Division', key: 'division' },
            { header: 'Rejection Comment', key: 'rejection_comment' },
            { header: 'Created Date', key: 'created_date' },
        ];

        const buffer = await exportToExcel(bookings, columns, 'Approvals');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=approvals_${Date.now()}.xlsx`);
        res.send(buffer);
    } catch (error) {
        console.error('Export approvals error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;