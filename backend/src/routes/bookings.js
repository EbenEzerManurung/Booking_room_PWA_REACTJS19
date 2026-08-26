const express = require('express');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET all bookings with pagination and filters
router.get('/', authenticate, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const status = req.query.status || '';
        const date = req.query.date || '';
        const startDate = req.query.startDate || '';
        const endDate = req.query.endDate || '';
        const offset = (page - 1) * limit;

        console.log('📊 Fetching bookings with params:', { page, limit, search, status, date, startDate, endDate });

        let query = `
            SELECT b.*, r.name as ruangan_name, u.full_name as user_name
            FROM bookings b
            JOIN ruangan r ON b.ruangan_id = r.id
            JOIN users u ON b.user_id = u.id
            WHERE 1=1
        `;
        const params = [];

        if (search && search.trim() !== '') {
            const searchTerm = search.trim();
            query += ` AND (r.name LIKE ? OR b.purpose LIKE ?)`;
            const pattern = `%${searchTerm}%`;
            params.push(pattern, pattern);
        }

        if (status && status !== 'all') {
            query += ` AND b.status = ?`;
            params.push(status);
        }

        if (date) {
            query += ` AND b.booking_date = ?`;
            params.push(date);
        }

        if (startDate) {
            query += ` AND b.booking_date >= ?`;
            params.push(startDate);
        }

        if (endDate) {
            query += ` AND b.booking_date <= ?`;
            params.push(endDate);
        }

        // Count total
        const countQuery = query.replace(
            /SELECT b\.\*, r\.name as ruangan_name, u\.full_name as user_name FROM bookings b JOIN ruangan r ON b\.ruangan_id = r\.id JOIN users u ON b\.user_id = u\.id/,
            'SELECT COUNT(*) as total'
        );
        const [countResult] = await db.query(countQuery, params);
        const total = countResult[0]?.total || 0;

        // Get pending count
        const [pendingResult] = await db.query(
            'SELECT COUNT(*) as pending FROM bookings WHERE status = "pending"'
        );
        const pendingCount = pendingResult[0]?.pending || 0;

        // Get confirmed count
        const [confirmedResult] = await db.query(
            'SELECT COUNT(*) as confirmed FROM bookings WHERE status = "confirmed"'
        );
        const confirmedCount = confirmedResult[0]?.confirmed || 0;

        // Get rejected count
        const [rejectedResult] = await db.query(
            'SELECT COUNT(*) as rejected FROM bookings WHERE status = "rejected"'
        );
        const rejectedCount = rejectedResult[0]?.rejected || 0;

        // Get data
        query += ' ORDER BY b.created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const [data] = await db.query(query, params);
        console.log(`✅ Found ${data.length} bookings`);

        res.json({
            success: true,
            data,
            pendingCount,
            confirmedCount,
            rejectedCount,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('❌ Error fetching bookings:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 🔥🔥🔥 TAMBAHKAN INI: CREATE BOOKING 🔥🔥🔥
router.post('/', authenticate, async (req, res) => {
    try {
        const { ruangan_id, booking_date, start_time, end_time, purpose, attendees } = req.body;
        const user_id = req.user.id;

        console.log('📝 Creating booking:', { ruangan_id, booking_date, start_time, end_time, purpose, attendees, user_id });

        // Validasi
        if (!ruangan_id || !booking_date || !start_time || !end_time) {
            return res.status(400).json({
                success: false,
                message: 'Ruangan, tanggal, jam mulai, dan jam selesai wajib diisi'
            });
        }

        // Cek apakah ruangan ada
        const [roomCheck] = await db.query(
            'SELECT id FROM ruangan WHERE id = ?',
            [ruangan_id]
        );
        if (roomCheck.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Ruangan tidak ditemukan'
            });
        }

        // Cek konflik jadwal
        const [conflict] = await db.query(
            `SELECT id FROM bookings 
             WHERE ruangan_id = ? 
             AND booking_date = ? 
             AND status != 'rejected' 
             AND status != 'cancelled'
             AND (
                 (start_time <= ? AND end_time > ?) OR
                 (start_time < ? AND end_time >= ?) OR
                 (start_time >= ? AND end_time <= ?)
             )`,
            [
                ruangan_id,
                booking_date,
                start_time, start_time,
                end_time, end_time,
                start_time, end_time
            ]
        );

        if (conflict.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Ruangan sudah dibooking pada jam tersebut'
            });
        }

        // Insert booking
        const [result] = await db.query(
            `INSERT INTO bookings 
             (ruangan_id, user_id, booking_date, start_time, end_time, purpose, attendees, status, created_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
            [
                ruangan_id,
                user_id,
                booking_date,
                start_time,
                end_time,
                purpose || '',
                attendees || 0
            ]
        );

        // Get created booking
        const [newBooking] = await db.query(
            `SELECT b.*, r.name as ruangan_name, u.full_name as user_name
             FROM bookings b
             JOIN ruangan r ON b.ruangan_id = r.id
             JOIN users u ON b.user_id = u.id
             WHERE b.id = ?`,
            [result.insertId]
        );

        console.log('✅ Booking created:', result.insertId);

        res.status(201).json({
            success: true,
            data: newBooking[0],
            message: 'Booking berhasil dibuat'
        });
    } catch (error) {
        console.error('❌ Error creating booking:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 🔥 TAMBAHKAN INI: GET BOOKING BY ID 🔥
router.get('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;

        const [data] = await db.query(
            `SELECT b.*, r.name as ruangan_name, u.full_name as user_name
             FROM bookings b
             JOIN ruangan r ON b.ruangan_id = r.id
             JOIN users u ON b.user_id = u.id
             WHERE b.id = ?`,
            [id]
        );

        if (data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Booking tidak ditemukan'
            });
        }

        res.json({
            success: true,
            data: data[0]
        });
    } catch (error) {
        console.error('❌ Error fetching booking:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 🔥 TAMBAHKAN INI: UPDATE BOOKING 🔥
router.put('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { ruangan_id, booking_date, start_time, end_time, purpose, attendees, status } = req.body;
        const user_id = req.user.id;

        console.log('📝 Updating booking:', { id, ruangan_id, booking_date, start_time, end_time, purpose, attendees, status });

        // Cek booking ada
        const [existing] = await db.query(
            'SELECT * FROM bookings WHERE id = ?',
            [id]
        );
        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Booking tidak ditemukan'
            });
        }

        // Cek apakah user authorized (admin atau pemilik booking)
        if (existing[0].user_id !== user_id && req.user.role !== 'superadmin' && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Anda tidak memiliki akses untuk mengedit booking ini'
            });
        }

        // Cek konflik jadwal (kecuali booking ini sendiri)
        if (ruangan_id && booking_date && start_time && end_time) {
            const [conflict] = await db.query(
                `SELECT id FROM bookings 
                 WHERE ruangan_id = ? 
                 AND booking_date = ? 
                 AND id != ?
                 AND status != 'rejected' 
                 AND status != 'cancelled'
                 AND (
                     (start_time <= ? AND end_time > ?) OR
                     (start_time < ? AND end_time >= ?) OR
                     (start_time >= ? AND end_time <= ?)
                 )`,
                [
                    ruangan_id,
                    booking_date,
                    id,
                    start_time, start_time,
                    end_time, end_time,
                    start_time, end_time
                ]
            );

            if (conflict.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'Ruangan sudah dibooking pada jam tersebut'
                });
            }
        }

        // Build update query
        let updateFields = [];
        let updateParams = [];

        if (ruangan_id) {
            updateFields.push('ruangan_id = ?');
            updateParams.push(ruangan_id);
        }
        if (booking_date) {
            updateFields.push('booking_date = ?');
            updateParams.push(booking_date);
        }
        if (start_time) {
            updateFields.push('start_time = ?');
            updateParams.push(start_time);
        }
        if (end_time) {
            updateFields.push('end_time = ?');
            updateParams.push(end_time);
        }
        if (purpose !== undefined) {
            updateFields.push('purpose = ?');
            updateParams.push(purpose);
        }
        if (attendees !== undefined) {
            updateFields.push('attendees = ?');
            updateParams.push(attendees);
        }
        if (status) {
            updateFields.push('status = ?');
            updateParams.push(status);
        }

        updateParams.push(id);

        await db.query(
            `UPDATE bookings SET ${updateFields.join(', ')} WHERE id = ?`,
            updateParams
        );

        // Get updated booking
        const [updated] = await db.query(
            `SELECT b.*, r.name as ruangan_name, u.full_name as user_name
             FROM bookings b
             JOIN ruangan r ON b.ruangan_id = r.id
             JOIN users u ON b.user_id = u.id
             WHERE b.id = ?`,
            [id]
        );

        console.log('✅ Booking updated:', id);

        res.json({
            success: true,
            data: updated[0],
            message: 'Booking berhasil diupdate'
        });
    } catch (error) {
        console.error('❌ Error updating booking:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 🔥 TAMBAHKAN INI: DELETE BOOKING 🔥
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const user_id = req.user.id;

        console.log('🗑️ Deleting booking:', id);

        // Cek booking ada
        const [existing] = await db.query(
            'SELECT * FROM bookings WHERE id = ?',
            [id]
        );
        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Booking tidak ditemukan'
            });
        }

        // Cek apakah user authorized (admin atau pemilik booking)
        if (existing[0].user_id !== user_id && req.user.role !== 'superadmin' && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Anda tidak memiliki akses untuk menghapus booking ini'
            });
        }

        await db.query(
            'DELETE FROM bookings WHERE id = ?',
            [id]
        );

        console.log('✅ Booking deleted:', id);

        res.json({
            success: true,
            message: 'Booking berhasil dihapus'
        });
    } catch (error) {
        console.error('❌ Error deleting booking:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 🔥 TAMBAHKAN INI: APPROVE BOOKING 🔥
router.put('/:id/approve', authenticate, async (req, res) => {
    try {
        const { id } = req.params;

        // Cek booking ada
        const [existing] = await db.query(
            'SELECT * FROM bookings WHERE id = ?',
            [id]
        );
        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Booking tidak ditemukan'
            });
        }

        // Hanya admin/superadmin/ga yang bisa approve
        if (req.user.role !== 'superadmin' && req.user.role !== 'admin' && req.user.role !== 'ga') {
            return res.status(403).json({
                success: false,
                message: 'Anda tidak memiliki akses untuk approve booking'
            });
        }

        await db.query(
            'UPDATE bookings SET status = "confirmed" WHERE id = ?',
            [id]
        );

        // Get updated booking
        const [updated] = await db.query(
            `SELECT b.*, r.name as ruangan_name, u.full_name as user_name
             FROM bookings b
             JOIN ruangan r ON b.ruangan_id = r.id
             JOIN users u ON b.user_id = u.id
             WHERE b.id = ?`,
            [id]
        );

        console.log('✅ Booking approved:', id);

        res.json({
            success: true,
            data: updated[0],
            message: 'Booking berhasil disetujui'
        });
    } catch (error) {
        console.error('❌ Error approving booking:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 🔥 TAMBAHKAN INI: REJECT BOOKING 🔥
router.put('/:id/reject', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        // Cek booking ada
        const [existing] = await db.query(
            'SELECT * FROM bookings WHERE id = ?',
            [id]
        );
        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Booking tidak ditemukan'
            });
        }

        // Hanya admin/superadmin/ga yang bisa reject
        if (req.user.role !== 'superadmin' && req.user.role !== 'admin' && req.user.role !== 'ga') {
            return res.status(403).json({
                success: false,
                message: 'Anda tidak memiliki akses untuk reject booking'
            });
        }

        // Simpan reason di purpose atau field lain jika ada
        const updatedPurpose = existing[0].purpose 
            ? `${existing[0].purpose} (Ditolak: ${reason || 'Tidak ada alasan'})`
            : `Ditolak: ${reason || 'Tidak ada alasan'}`;

        await db.query(
            'UPDATE bookings SET status = "rejected", purpose = ? WHERE id = ?',
            [updatedPurpose, id]
        );

        // Get updated booking
        const [updated] = await db.query(
            `SELECT b.*, r.name as ruangan_name, u.full_name as user_name
             FROM bookings b
             JOIN ruangan r ON b.ruangan_id = r.id
             JOIN users u ON b.user_id = u.id
             WHERE b.id = ?`,
            [id]
        );

        console.log('✅ Booking rejected:', id);

        res.json({
            success: true,
            data: updated[0],
            message: 'Booking berhasil ditolak'
        });
    } catch (error) {
        console.error('❌ Error rejecting booking:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 🔥 TAMBAHKAN INI: CANCEL BOOKING 🔥
router.put('/:id/cancel', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const user_id = req.user.id;

        // Cek booking ada
        const [existing] = await db.query(
            'SELECT * FROM bookings WHERE id = ?',
            [id]
        );
        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Booking tidak ditemukan'
            });
        }

        // Cek apakah user authorized (admin atau pemilik booking)
        if (existing[0].user_id !== user_id && req.user.role !== 'superadmin' && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Anda tidak memiliki akses untuk cancel booking ini'
            });
        }

        await db.query(
            'UPDATE bookings SET status = "cancelled" WHERE id = ?',
            [id]
        );

        // Get updated booking
        const [updated] = await db.query(
            `SELECT b.*, r.name as ruangan_name, u.full_name as user_name
             FROM bookings b
             JOIN ruangan r ON b.ruangan_id = r.id
             JOIN users u ON b.user_id = u.id
             WHERE b.id = ?`,
            [id]
        );

        console.log('✅ Booking cancelled:', id);

        res.json({
            success: true,
            data: updated[0],
            message: 'Booking berhasil dibatalkan'
        });
    } catch (error) {
        console.error('❌ Error cancelling booking:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;