const express = require('express');
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// GET all ruangan (with pagination, filter, search)
router.get('/', authenticate, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const offset = (page - 1) * limit;

        let query = 'SELECT * FROM ruangan WHERE 1=1';
        const params = [];

        if (search) {
            query += ' AND (name LIKE ? OR location LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        // Count total
        const [countResult] = await db.query(
            query.replace('SELECT *', 'SELECT COUNT(*) as total'),
            params
        );
        const total = countResult[0]?.total || 0;

        // Get data
        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const [data] = await db.query(query, params);

        res.json({
            success: true,
            data,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET all ruangan (no pagination)
router.get('/all', authenticate, async (req, res) => {
    try {
        const [data] = await db.query('SELECT * FROM ruangan WHERE is_active = 1 ORDER BY name');
        res.json(data);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET ruangan by ID
router.get('/:id', authenticate, async (req, res) => {
    try {
        const [data] = await db.query('SELECT * FROM ruangan WHERE id = ?', [req.params.id]);
        if (data.length === 0) {
            return res.status(404).json({ success: false, message: 'Ruangan tidak ditemukan' });
        }
        res.json({ success: true, data: data[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// CREATE ruangan
router.post('/', authenticate, authorize(['superadmin', 'receptionist']), async (req, res) => {
    try {
        const { name, capacity, location, facilities, is_active = true } = req.body;

        if (!name || !capacity) {
            return res.status(400).json({ success: false, message: 'Nama dan kapasitas wajib diisi' });
        }

        const [result] = await db.query(
            `INSERT INTO ruangan (name, capacity, location, facilities, is_active, created_by) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [name, capacity, location, facilities, is_active, req.user.id]
        );

        res.status(201).json({
            success: true,
            message: 'Ruangan berhasil ditambahkan',
            data: { id: result.insertId },
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// UPDATE ruangan
router.put('/:id', authenticate, authorize(['superadmin', 'receptionist']), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, capacity, location, facilities, is_active } = req.body;

        const [existing] = await db.query('SELECT id FROM ruangan WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Ruangan tidak ditemukan' });
        }

        await db.query(
            `UPDATE ruangan SET 
                name = ?, capacity = ?, location = ?, facilities = ?, is_active = ?, updated_at = NOW()
             WHERE id = ?`,
            [name, capacity, location, facilities, is_active, id]
        );

        res.json({ success: true, message: 'Ruangan berhasil diupdate' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// DELETE ruangan
router.delete('/:id', authenticate, authorize(['superadmin', 'receptionist']), async (req, res) => {
    try {
        const { id } = req.params;

        const [existing] = await db.query('SELECT id FROM ruangan WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Ruangan tidak ditemukan' });
        }

        // Cek apakah ruangan sedang digunakan
        const [bookings] = await db.query(
            'SELECT id FROM bookings WHERE ruangan_id = ? AND status = "pending"',
            [id]
        );

        if (bookings.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Ruangan sedang digunakan untuk booking, tidak bisa dihapus'
            });
        }

        await db.query('DELETE FROM ruangan WHERE id = ?', [id]);
        res.json({ success: true, message: 'Ruangan berhasil dihapus' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// TOGGLE ruangan status
router.patch('/:id/toggle-status', authenticate, authorize(['superadmin', 'receptionist']), async (req, res) => {
    try {
        const { id } = req.params;
        const { is_active } = req.body;

        await db.query('UPDATE ruangan SET is_active = ?, updated_at = NOW() WHERE id = ?', [is_active, id]);
        res.json({
            success: true,
            message: `Ruangan ${is_active ? 'diaktifkan' : 'dinonaktifkan'}`
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// EXPORT to Excel
router.get('/export/excel', authenticate, authorize(['superadmin', 'receptionist']), async (req, res) => {
    try {
        const [data] = await db.query(`
            SELECT 
                name as 'Nama',
                capacity as 'Kapasitas',
                location as 'Lokasi',
                facilities as 'Fasilitas',
                CASE WHEN is_active = 1 THEN 'Aktif' ELSE 'Tidak Aktif' END as 'Status',
                DATE(created_at) as 'Tanggal Dibuat'
            FROM ruangan 
            ORDER BY created_at DESC
        `);

        // Gunakan xlsx untuk export
        const XLSX = require('xlsx');
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Ruangan');

        // Auto column width
        const colWidths = Object.keys(data[0] || {}).map(key => ({
            wch: Math.max(key.length, 15)
        }));
        ws['!cols'] = colWidths;

        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=ruangan_${Date.now()}.xlsx`);
        res.send(buffer);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;