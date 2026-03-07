const express = require('express');
const router = express.Router();
const { mongoose } = require('../db');

// GET /api/stores - Lấy danh sách cửa hàng với phân trang & tìm kiếm
router.get('/', async (req, res) => {
    try {
        const collection = mongoose.connection.db.collection('storesystem_full');
        const { keyword = '', tinh_thanh = '', quan_huyen = '', phuong_xa = '', page = 1, limit = 10 } = req.query;

        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.max(1, Math.min(100, parseInt(limit)));
        const skip = (pageNum - 1) * limitNum;

        // Xây dựng query
        const query = {};
        if (keyword) {
            query.$or = [
                { ten_cua_hang: { $regex: keyword, $options: 'i' } },
                { 'dia_chi.dia_chi_day_du': { $regex: keyword, $options: 'i' } },
                { 'dia_chi.tinh_thanh': { $regex: keyword, $options: 'i' } },
                { 'dia_chi.quan_huyen': { $regex: keyword, $options: 'i' } },
            ];
        }
        if (tinh_thanh && tinh_thanh !== 'Tất cả') {
            query['dia_chi.tinh_thanh'] = { $regex: tinh_thanh, $options: 'i' };
        }
        if (quan_huyen && quan_huyen !== 'Tất cả') {
            query['dia_chi.quan_huyen'] = { $regex: quan_huyen, $options: 'i' };
        }
        if (phuong_xa && phuong_xa !== 'Tất cả') {
            query['dia_chi.phuong_xa'] = { $regex: phuong_xa, $options: 'i' };
        }

        const total = await collection.countDocuments(query);
        const stores = await collection.find(query).skip(skip).limit(limitNum).toArray();

        res.json({
            data: stores,
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum),
        });
    } catch (err) {
        console.error('Lỗi GET /api/stores:', err);
        res.status(500).json({ error: 'Lỗi server', message: err.message });
    }
});

// GET /api/stores/locations - Lấy danh sách phân cấp Tỉnh/Thành, Quận/Huyện, Phường/Xã
router.get('/locations', async (req, res) => {
    try {
        const collection = mongoose.connection.db.collection('storesystem_full');

        // Pipeline để nhóm theo Tỉnh -> Quận -> Phường
        const pipeline = [
            {
                $group: {
                    _id: {
                        tinh: "$dia_chi.tinh_thanh",
                        quan: "$dia_chi.quan_huyen",
                        phuong: "$dia_chi.phuong_xa"
                    }
                }
            },
            {
                $group: {
                    _id: {
                        tinh: "$_id.tinh",
                        quan: "$_id.quan"
                    },
                    phuongs: { $addToSet: "$_id.phuong" }
                }
            },
            {
                $group: {
                    _id: "$_id.tinh",
                    quans: {
                        $addToSet: {
                            ten: "$_id.quan",
                            phuongs: "$phuongs"
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    tinh: "$_id",
                    quans: 1
                }
            },
            { $sort: { tinh: 1 } }
        ];

        const locations = await collection.aggregate(pipeline).toArray();
        res.json(locations);
    } catch (err) {
        console.error('Lỗi GET /api/stores/locations:', err);
        res.status(500).json({ error: 'Lỗi server', message: err.message });
    }
});

// GET /api/stores/:ma_cua_hang - Lấy chi tiết 1 cửa hàng
router.get('/:ma_cua_hang', async (req, res) => {
    try {
        const collection = mongoose.connection.db.collection('storesystem_full');
        const store = await collection.findOne({ ma_cua_hang: req.params.ma_cua_hang });
        if (!store) return res.status(404).json({ error: 'Không tìm thấy cửa hàng' });
        res.json(store);
    } catch (err) {
        console.error('Lỗi GET /api/stores/:id:', err);
        res.status(500).json({ error: 'Lỗi server', message: err.message });
    }
});

module.exports = router;
