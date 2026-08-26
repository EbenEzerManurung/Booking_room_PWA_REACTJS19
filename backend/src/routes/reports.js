const express = require('express');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Dashboard statistics - Mengambil dari tabel yang sudah ada
router.get('/dashboard', authenticate, async (req, res) => {
    try {
        console.log('📊 Fetching dashboard data...');

        // 1. Total Ruangan dari tabel ruangan
        const [rooms] = await db.query('SELECT COUNT(*) as total FROM ruangan WHERE is_active = 1');
        console.log('✅ Rooms:', rooms[0]?.total);

        // 2. Total Booking dari tabel bookings
        const [bookings] = await db.query('SELECT COUNT(*) as total FROM bookings');
        console.log('✅ Bookings:', bookings[0]?.total);

        // 3. Pending Approvals dari tabel bookings
        const [pending] = await db.query('SELECT COUNT(*) as total FROM bookings WHERE status = "pending"');
        console.log('✅ Pending:', pending[0]?.total);

        // 4. Confirmed Bookings dari tabel bookings
        const [confirmed] = await db.query('SELECT COUNT(*) as total FROM bookings WHERE status = "confirmed"');
        console.log('✅ Confirmed:', confirmed[0]?.total);

        // 5. Rejected Bookings dari tabel bookings
        const [rejected] = await db.query('SELECT COUNT(*) as total FROM bookings WHERE status = "rejected"');
        console.log('✅ Rejected:', rejected[0]?.total);

        // 6. Total Users dari tabel users
        const [users] = await db.query('SELECT COUNT(*) as total FROM users WHERE is_active = 1');
        console.log('✅ Users:', users[0]?.total);

        // 7. Weekly Booking Data dari tabel bookings (7 hari terakhir)
        const [weekly] = await db.query(`
            SELECT 
                DATE(booking_date) as date,
                COUNT(*) as count
            FROM bookings
            WHERE booking_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            GROUP BY DATE(booking_date)
            ORDER BY booking_date ASC
        `);
        console.log('✅ Weekly data:', weekly.length);

        // Buat array 7 hari terakhir
        const weekDays = [];
        const weeklyData = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
            weekDays.push(dayName);
            
            const found = weekly.find(w => w.date.toISOString().split('T')[0] === dateStr);
            weeklyData.push(found ? found.count : 0);
        }

        // 8. Recent Bookings dari tabel bookings
        const [recent] = await db.query(`
            SELECT 
                b.id,
                b.booking_date,
                b.start_time,
                b.end_time,
                b.purpose,
                b.status,
                r.name as ruangan_name,
                u.full_name as user_name
            FROM bookings b
            JOIN ruangan r ON b.ruangan_id = r.id
            JOIN users u ON b.user_id = u.id
            ORDER BY b.created_at DESC
            LIMIT 10
        `);
        console.log('✅ Recent bookings:', recent.length);

        // 9. Room Usage dari tabel bookings dan ruangan
        const [roomUsage] = await db.query(`
            SELECT 
                r.id,
                r.name,
                r.capacity,
                COUNT(b.id) as total_bookings
            FROM ruangan r
            LEFT JOIN bookings b ON r.id = b.ruangan_id AND b.status = 'confirmed'
            WHERE r.is_active = 1
            GROUP BY r.id
            ORDER BY total_bookings DESC
            LIMIT 10
        `);
        console.log('✅ Room usage:', roomUsage.length);

        // 10. Status Counts dari tabel bookings
        const [statusCounts] = await db.query(`
            SELECT 
                status,
                COUNT(*) as count
            FROM bookings
            GROUP BY status
        `);
        console.log('✅ Status counts:', statusCounts.length);

        // Format status counts
        const statusMap = {};
        statusCounts.forEach(item => {
            statusMap[item.status] = item.count;
        });

        const response = {
            totalRooms: rooms[0]?.total || 0,
            totalBookings: bookings[0]?.total || 0,
            pendingApprovals: pending[0]?.total || 0,
            confirmedBookings: confirmed[0]?.total || 0,
            rejectedBookings: rejected[0]?.total || 0,
            totalUsers: users[0]?.total || 0,
            weeklyLabels: weekDays,
            weeklyData: weeklyData,
            recentBookings: recent || [],
            roomUsage: roomUsage.map(r => r.total_bookings),
            roomLabels: roomUsage.map(r => r.name),
            roomDetails: roomUsage,
            statusCounts: statusMap,
        };

        console.log('📊 Dashboard data sent successfully');
        res.json(response);

    } catch (error) {
        console.error('❌ Dashboard error:', error);
        res.status(500).json({ 
            message: 'Server error', 
            error: error.message 
        });
    }
});

module.exports = router;