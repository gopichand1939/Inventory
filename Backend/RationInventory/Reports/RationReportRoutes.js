const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../../Auth/AuthMiddleware");
const {
    getCurrentStockReport,
    getPurchaseHistoryReport,
    getStockIssueReport,
    getStockAdjustmentReport,
    getStockAuditReport,
    getLowStockReport,
    getExpiryReport,
} = require("./RationReportController");

router.get("/current-stock", authenticateToken, getCurrentStockReport);
router.get("/purchase-history", authenticateToken, getPurchaseHistoryReport);
router.get("/stock-issue", authenticateToken, getStockIssueReport);
router.get("/stock-adjustment", authenticateToken, getStockAdjustmentReport);
router.get("/stock-audit", authenticateToken, getStockAuditReport);
router.get("/low-stock", authenticateToken, getLowStockReport);
router.get("/expiry-report", authenticateToken, getExpiryReport);

module.exports = router;
