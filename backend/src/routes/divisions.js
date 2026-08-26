const express = require('express');
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// ============================================
// GET ALL DIVISIONS
// ============================================
router.get('/', authenticate, async (req, res) => {
    try {
        const [divisions] = await db.query(
            'SELECT * FROM divisions ORDER BY name'
        );
        res.json(divisions);
    } catch (error) {
        console.error('Get divisions error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ============================================
// GET DIVISION BY ID
// ============================================
router.get('/:id', authenticate, authorize(['superadmin']), async (req, res) => {
    try {
        const [divisions] = await db.query(
            'SELECT * FROM divisions WHERE id = ?',
            [req.params.id]
        );
        
        if (divisions.length === 0) {
            return res.status(404).json({ message: 'Division not found' });
        }
        
        res.json(divisions[0]);
    } catch (error) {
        console.error('Get division error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ============================================
// CREATE DIVISION
// ============================================
router.post('/', authenticate, authorize(['superadmin']), async (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'Name is required' });
        }

        const [existing] = await db.query(
            'SELECT id FROM divisions WHERE name = ?',
            [name]
        );

        if (existing.length > 0) {
            return res.status(400).json({ message: 'Division already exists' });
        }

        const [result] = await db.query(
            'INSERT INTO divisions (name, description) VALUES (?, ?)',
            [name, description]
        );

        res.status(201).json({
            success: true,
            message: 'Division created successfully',
            data: { id: result.insertId },
        });
    } catch (error) {
        console.error('Create division error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ============================================
// UPDATE DIVISION
// ============================================
router.put('/:id', authenticate, authorize(['superadmin']), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;

        const [existing] = await db.query(
            'SELECT id FROM divisions WHERE id = ?',
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({ message: 'Division not found' });
        }

        await db.query(
            'UPDATE divisions SET name = ?, description = ?, updated_at = NOW() WHERE id = ?',
            [name, description, id]
        );

        res.json({ success: true, message: 'Division updated successfully' });
    } catch (error) {
        console.error('Update division error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// DELETE DIVISION============================================

// ============================================
router.delete('/:id', authenticate, authorize(['superadmin']), async (req, res) => {
    try {
        const { id } = req.params;

        const [existing] = await db.query(
            'SELECT id FROM divisions WHERE id = ?',
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({ message: 'Division not found' });
        }

        await db.query('DELETE FROM divisions WHERE id = ?', [id]);
        res.json({ success: true, message: 'Division deleted successfully' });
    } catch (error) {
        console.error('Delete division error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;