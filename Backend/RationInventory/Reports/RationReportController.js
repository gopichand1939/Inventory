const { query } = require("../../Config/Database");

// Helper to escape CSV values safely
const escapeCSV = (val) => {
    if (val === null || val === undefined) return "";
    const str = String(val);
    if (str.includes(",") || str.includes("\"") || str.includes("\n") || str.includes("\r")) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
};

// Helper to convert rows to CSV format string
const convertToCSV = (headers, rowMapper, data) => {
    const csvLines = [];
    csvLines.push(headers.join(","));

    for (const item of data) {
        const mapped = rowMapper(item);
        csvLines.push(mapped.map(escapeCSV).join(","));
    }

    return csvLines.join("\n");
};

const getCurrentStockReport = async (req, res) => {
    try {
        const institutionId = req.user?.institution_id || 1;

        const sql = `
            SELECT 
                i.item_name, i.item_code, i.barcode, c.category_name, u.unit_code,
                i.minimum_stock, i.maximum_stock, i.default_purchase_price,
                COALESCE(SUM(l.quantity_in - l.quantity_out), 0) AS current_stock
            FROM ration_items i
            LEFT JOIN ration_item_categories c ON i.category_id = c.id
            LEFT JOIN ration_units u ON i.unit_id = u.id
            LEFT JOIN ration_stock_ledger l ON i.id = l.item_id
            WHERE i.institution_id = $1
            GROUP BY i.id
            ORDER BY i.item_name ASC
        `;

        const result = await query(sql, [institutionId]);
        const csv = convertToCSV(
            ["Item Name", "Item Code", "Barcode", "Category", "Unit", "Min Stock", "Max Stock", "Unit Price (INR)", "Current Stock"],
            (r) => [
                r.item_name, r.item_code, r.barcode, r.category_name, r.unit_code,
                r.minimum_stock, r.maximum_stock, r.default_purchase_price, r.current_stock
            ],
            result.rows
        );

        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=current_stock_report.csv");
        return res.send(csv);
    } catch (err) {
        console.error("Failed to generate current stock CSV:", err);
        return res.status(500).json({ success: false, message: "Failed to generate report" });
    }
};

const getPurchaseHistoryReport = async (req, res) => {
    try {
        const institutionId = req.user?.institution_id || 1;

        const sql = `
            SELECT 
                p.purchase_number, p.purchase_date, s.supplier_name,
                p.sub_total, p.discount_amount, p.gst_amount, p.grand_total,
                p.payment_status, p.status
            FROM ration_purchases p
            LEFT JOIN ration_suppliers s ON p.supplier_id = s.id
            WHERE p.institution_id = $1
            ORDER BY p.purchase_date DESC
        `;

        const result = await query(sql, [institutionId]);
        const csv = convertToCSV(
            ["Purchase No", "Date", "Supplier", "Sub Total", "Discount", "GST Amount", "Grand Total", "Payment Status", "Status"],
            (r) => [
                r.purchase_number, r.purchase_date, r.supplier_name,
                r.sub_total, r.discount_amount, r.gst_amount, r.grand_total,
                r.payment_status, r.status
            ],
            result.rows
        );

        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=purchase_history_report.csv");
        return res.send(csv);
    } catch (err) {
        console.error("Failed to generate purchase report CSV:", err);
        return res.status(500).json({ success: false, message: "Failed to generate report" });
    }
};

const getStockIssueReport = async (req, res) => {
    try {
        const institutionId = req.user?.institution_id || 1;

        const sql = `
            SELECT 
                si.issue_number, si.issue_date, kr.request_number,
                u.email AS issued_to_user, si.remarks,
                item.item_name, sii.issue_quantity, item_u.unit_code
            FROM ration_stock_issues si
            JOIN ration_kitchen_requests kr ON si.kitchen_request_id = kr.id
            LEFT JOIN user_credentials u ON si.issued_to = u.id
            JOIN ration_stock_issue_items sii ON si.id = sii.stock_issue_id
            JOIN ration_items item ON sii.item_id = item.id
            LEFT JOIN ration_units item_u ON item.unit_id = item_u.id
            WHERE si.institution_id = $1
            ORDER BY si.issue_date DESC
        `;

        const result = await query(sql, [institutionId]);
        const csv = convertToCSV(
            ["Issue No", "Issue Date", "Request No", "Issued To", "Remarks", "Item Name", "Issue Quantity", "Unit"],
            (r) => [
                r.issue_number, r.issue_date, r.request_number, r.issued_to_user, r.remarks,
                r.item_name, r.issue_quantity, r.unit_code
            ],
            result.rows
        );

        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=stock_issue_report.csv");
        return res.send(csv);
    } catch (err) {
        console.error("Failed to generate stock issue report CSV:", err);
        return res.status(500).json({ success: false, message: "Failed to generate report" });
    }
};

const getStockAdjustmentReport = async (req, res) => {
    try {
        const institutionId = req.user?.institution_id || 1;

        const sql = `
            SELECT 
                sa.adjustment_number, sa.adjustment_date, sa.reason AS main_reason,
                item.item_name, sai.current_stock, sai.adjustment_quantity,
                sai.adjustment_direction, sai.new_stock, sai.reason AS item_reason
            FROM ration_stock_adjustments sa
            JOIN ration_stock_adjustment_items sai ON sa.id = sai.stock_adjustment_id
            JOIN ration_items item ON sai.item_id = item.id
            WHERE sa.institution_id = $1
            ORDER BY sa.adjustment_date DESC
        `;

        const result = await query(sql, [institutionId]);
        const csv = convertToCSV(
            ["Adjustment No", "Date", "Reason", "Item Name", "Pre Stock", "Adjust Qty", "Direction", "Post Stock", "Item Remarks"],
            (r) => [
                r.adjustment_number, r.adjustment_date, r.main_reason, r.item_name,
                r.current_stock, r.adjustment_quantity, r.adjustment_direction, r.new_stock, r.item_reason
            ],
            result.rows
        );

        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=stock_adjustment_report.csv");
        return res.send(csv);
    } catch (err) {
        console.error("Failed to generate stock adjustment report CSV:", err);
        return res.status(500).json({ success: false, message: "Failed to generate report" });
    }
};

const getStockAuditReport = async (req, res) => {
    try {
        const institutionId = req.user?.institution_id || 1;

        const sql = `
            SELECT 
                sa.audit_number, sa.audit_date, sa.audit_name, sa.status,
                item.item_name, sai.system_stock, sai.physical_stock,
                sai.difference_quantity, sai.adjustment_direction
            FROM ration_stock_audits sa
            JOIN ration_stock_audit_items sai ON sa.id = sai.audit_id
            JOIN ration_items item ON sai.item_id = item.id
            WHERE sa.institution_id = $1
            ORDER BY sa.audit_date DESC
        `;

        const result = await query(sql, [institutionId]);
        const csv = convertToCSV(
            ["Audit No", "Date", "Audit Title", "Status", "Item Name", "System Qty", "Physical Qty", "Variance Qty", "Direction"],
            (r) => [
                r.audit_number, r.audit_date, r.audit_name, r.status, r.item_name,
                r.system_stock, r.physical_stock, r.difference_quantity, r.adjustment_direction
            ],
            result.rows
        );

        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=stock_audit_report.csv");
        return res.send(csv);
    } catch (err) {
        console.error("Failed to generate stock audit CSV:", err);
        return res.status(500).json({ success: false, message: "Failed to generate report" });
    }
};

const getLowStockReport = async (req, res) => {
    try {
        const institutionId = req.user?.institution_id || 1;

        const sql = `
            SELECT * FROM (
                SELECT 
                    i.item_name, i.item_code, i.barcode, c.category_name, u.unit_code,
                    i.minimum_stock, i.default_purchase_price,
                    COALESCE(SUM(l.quantity_in - l.quantity_out), 0) AS current_stock
                FROM ration_items i
                LEFT JOIN ration_item_categories c ON i.category_id = c.id
                LEFT JOIN ration_units u ON i.unit_id = u.id
                LEFT JOIN ration_stock_ledger l ON i.id = l.item_id
                WHERE i.institution_id = $1
                GROUP BY i.id
            ) WHERE current_stock < minimum_stock
            ORDER BY item_name ASC
        `;

        const result = await query(sql, [institutionId]);
        const csv = convertToCSV(
            ["Item Name", "Item Code", "Barcode", "Category", "Unit", "Min Stock Level", "Current Stock Level"],
            (r) => [
                r.item_name, r.item_code, r.barcode, r.category_name, r.unit_code,
                r.minimum_stock, r.current_stock
            ],
            result.rows
        );

        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=low_stock_report.csv");
        return res.send(csv);
    } catch (err) {
        console.error("Failed to generate low stock report CSV:", err);
        return res.status(500).json({ success: false, message: "Failed to generate report" });
    }
};

const getExpiryReport = async (req, res) => {
    try {
        const institutionId = req.user?.institution_id || 1;

        const sql = `
            SELECT 
                item.item_name, item.item_code, c.category_name,
                b.batch_number, b.manufacturing_date, b.expiry_date,
                b.remaining_quantity, item_u.unit_code,
                CASE WHEN date(b.expiry_date) < date('now') THEN 'Expired' ELSE 'Active' END AS expiry_status
            FROM ration_item_batches b
            JOIN ration_items item ON b.item_id = item.id
            LEFT JOIN ration_item_categories c ON item.category_id = c.id
            LEFT JOIN ration_units item_u ON item.unit_id = item_u.id
            WHERE b.institution_id = $1 AND b.remaining_quantity > 0 AND b.expiry_date IS NOT NULL
            ORDER BY b.expiry_date ASC
        `;

        const result = await query(sql, [institutionId]);
        const csv = convertToCSV(
            ["Item Name", "Item Code", "Category", "Batch Number", "Mfg Date", "Expiry Date", "Remaining Qty", "Unit", "Expiry Status"],
            (r) => [
                r.item_name, r.item_code, r.category_name, r.batch_number, r.manufacturing_date,
                r.expiry_date, r.remaining_quantity, r.unit_code, r.expiry_status
            ],
            result.rows
        );

        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=expiry_report.csv");
        return res.send(csv);
    } catch (err) {
        console.error("Failed to generate expiry report CSV:", err);
        return res.status(500).json({ success: false, message: "Failed to generate report" });
    }
};

module.exports = {
    getCurrentStockReport,
    getPurchaseHistoryReport,
    getStockIssueReport,
    getStockAdjustmentReport,
    getStockAuditReport,
    getLowStockReport,
    getExpiryReport,
};
