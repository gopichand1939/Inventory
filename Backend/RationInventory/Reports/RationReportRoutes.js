const express = require("express");
const router = express.Router();
const { protectAuth } = require("../../Auth/AuthMiddleware");
const {
    getCurrentStockReport,
    getPurchaseHistoryReport,
    getStockIssueReport,
    getStockAdjustmentReport,
    getStockAuditReport,
    getLowStockReport,
    getExpiryReport,
} = require("./RationReportController");

const protectRationAccess = protectAuth(["super_admin", "pg_admin"]);

router.get("/current-stock", protectRationAccess, getCurrentStockReport);
router.get("/purchase-history", protectRationAccess, getPurchaseHistoryReport);
router.get("/stock-issue", protectRationAccess, getStockIssueReport);
router.get("/stock-adjustment", protectRationAccess, getStockAdjustmentReport);
router.get("/stock-audit", protectRationAccess, getStockAuditReport);
router.get("/low-stock", protectRationAccess, getLowStockReport);
router.get("/expiry-report", protectRationAccess, getExpiryReport);

module.exports = router;
