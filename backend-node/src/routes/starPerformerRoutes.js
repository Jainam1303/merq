const express = require('express');
const router = express.Router();
const { StarPerformer } = require('../models');
const { Op } = require('sequelize');

// ========================================
// GET /api/star-performers
// Public endpoint - no auth required
// Returns pre-computed backtest results
// ========================================
router.get('/', async (req, res) => {
    try {
        const { timeframe, strategy, sort, limit } = req.query;

        const where = {};
        if (timeframe) where.timeframe = timeframe;
        if (strategy) where.strategy = strategy;

        // Only show results with actual trades
        where.total_trades = { [Op.gt]: 0 };

        let order = [['total_return_pct', 'DESC']]; // Default: best returns first
        if (sort === 'win_rate') order = [['win_rate', 'DESC']];
        if (sort === 'trades') order = [['total_trades', 'DESC']];
        if (sort === 'drawdown') order = [['max_drawdown_pct', 'ASC']]; // Least drawdown first

        const results = await StarPerformer.findAll({
            where,
            order,
            limit: parseInt(limit) || 50,
            attributes: [
                'id', 'symbol', 'exchange', 'strategy', 'strategy_label', 'timeframe',
                'total_return_pct', 'total_return_inr', 'starting_capital', 'ending_capital',
                'total_trades', 'winning_trades', 'losing_trades', 'win_rate',
                'max_drawdown_pct', 'equity_curve', 'deploy_config',
                'from_date', 'to_date', 'last_computed', 'updatedAt'
            ]
        });

        // Get last update time
        const lastUpdate = results.length > 0
            ? results.reduce((latest, r) => {
                const t = new Date(r.last_computed || r.updatedAt);
                return t > latest ? t : latest;
            }, new Date(0))
            : null;

        res.json({
            status: 'success',
            last_updated: lastUpdate,
            count: results.length,
            data: results
        });

    } catch (error) {
        console.error('[StarPerformers] GET Error:', error.message);
        res.status(500).json({ status: 'error', message: 'Failed to fetch star performers' });
    }
});

// ========================================
// GET /api/star-performers/:id/trades
// Returns detailed trade list for a specific result
// ========================================
router.get('/:id/trades', async (req, res) => {
    try {
        const result = await StarPerformer.findByPk(req.params.id, {
            attributes: ['id', 'symbol', 'strategy', 'timeframe', 'trades', 'equity_curve']
        });

        if (!result) {
            return res.status(404).json({ status: 'error', message: 'Not found' });
        }

        res.json({
            status: 'success',
            data: result
        });

    } catch (error) {
        console.error('[StarPerformers] GET trades Error:', error.message);
        res.status(500).json({ status: 'error', message: 'Failed to fetch trade details' });
    }
});

// ========================================
// GET /api/star-performers/timeframes
// Returns available timeframes
// ========================================
router.get('/meta/timeframes', async (req, res) => {
    try {
        const timeframes = await StarPerformer.findAll({
            attributes: ['timeframe'],
            group: ['timeframe'],
            raw: true
        });

        res.json({
            status: 'success',
            data: timeframes.map(t => t.timeframe)
        });
    } catch (error) {
        res.json({ status: 'success', data: ['7d', '30d', '90d', '120d'] });
    }
});

module.exports = router;
