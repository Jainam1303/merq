const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyAdmin } = require('../middleware/adminMiddleware');

// All routes require admin authentication
router.use(verifyAdmin);

// Dashboard
router.get('/dashboard', adminController.getDashboard);

// Users
router.get('/users', adminController.getUsers);
router.get('/users/export', adminController.exportUsers);
router.get('/users/:id', adminController.getUserDetail);
router.post('/users/:id/toggle', adminController.toggleUserStatus);
router.post('/users/:id/plan', adminController.assignPlan);
router.post('/users/:id/reset-password', adminController.resetPassword);
router.post('/users/:id/notes', adminController.addNote);
router.delete('/users/:id', adminController.deleteUser);

// Trades
router.get('/trades', adminController.getGlobalTrades);
router.get('/trades/export', adminController.exportTrades);

// Plans
router.get('/plans', adminController.getPlans);
router.post('/plans', adminController.createPlan);
router.put('/plans/:id', adminController.updatePlan);
router.delete('/plans/:id', adminController.deletePlan);

// Revenue
router.get('/revenue', adminController.getRevenue);

// System
router.get('/system/health', adminController.getSystemHealth);
router.post('/system/kill', adminController.killSwitch);
router.get('/system/connectivity', adminController.checkConnectivity);

// Announcements (public endpoint for users is separate)
router.get('/announcements', adminController.getAnnouncements);
router.post('/announcements', adminController.createAnnouncement);
router.delete('/announcements/:id', adminController.deleteAnnouncement);

// Audit Logs
router.get('/audit-logs', adminController.getAuditLogs);
router.get('/audit-logs/export', adminController.exportAuditLogs);

module.exports = router;
