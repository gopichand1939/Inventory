require("dns").setDefaultResultOrder("ipv4first");
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ quiet: true });

const initDatabase = require("./Config/initDatabase.sqlite");
const { contextStorage, shutdownPool } = require("./Config/Database");
const authRoutes = require("./Auth/AuthRoutes");
const superAdminRoutes = require("./SuperAdmin/SuperAdminRoutes");
const rationCategoryRoutes = require("./RationInventory/CategoryMaster/RationCategoryRoutes");
const rationUnitRoutes = require("./RationInventory/UnitMaster/RationUnitRoutes");
const rationItemRoutes = require("./RationInventory/ItemMaster/RationItemRoutes");
const rationSupplierRoutes = require("./RationInventory/SupplierMaster/RationSupplierRoutes");
const rationPurchaseRoutes = require("./RationInventory/Purchase/RationPurchaseRoutes");
const rationCurrentStockRoutes = require("./RationInventory/CurrentStock/RationCurrentStockRoutes");
const rationKitchenRequestRoutes = require("./RationInventory/KitchenRequest/KitchenRequestRoutes");
const rationStockIssueRoutes = require("./RationInventory/StockIssue/RationStockIssueRoutes");
const rationStockAdjustmentRoutes = require("./RationInventory/StockAdjustment/RationStockAdjustmentRoutes");
const rationStockAuditRoutes = require("./RationInventory/StockAudit/RationStockAuditRoutes");
const rationInventoryDashboardRoutes = require("./RationInventory/InventoryDashboard/RationInventoryDashboardRoutes");
const rationReportRoutes = require("./RationInventory/Reports/RationReportRoutes");

const app = express();

let reqCounter = 0;
// Register HTTP request context middleware for database logging URL resolution
app.use((req, res, next) => {
    const requestId = `${Date.now()}-${++reqCounter}`;
    contextStorage.run({ requestId, method: req.method, url: req.originalUrl || req.url }, () => {
        next();
    });
});

const logDirectory = path.join(__dirname, "logs");
const runtimeLogPath = path.join(logDirectory, "runtime.log");
const shouldInitDatabaseOnStartup = process.env.RUN_DB_INIT_ON_STARTUP === "true";

const ensureLogDirectory = () => {
    if (!fs.existsSync(logDirectory)) {
        fs.mkdirSync(logDirectory, { recursive: true });
    }
};

const formatErrorDetails = (value) => {
    if (value instanceof Error) {
        return value.stack || value.message;
    }

    if (typeof value === "string") {
        return value;
    }

    try {
        return JSON.stringify(value, null, 2);
    } catch (error) {
        return String(value);
    }
};

const logRuntimeEvent = (label, details) => {
    const message = `[${new Date().toISOString()}] ${label}\n${formatErrorDetails(details)}\n\n`;

    ensureLogDirectory();
    fs.appendFileSync(runtimeLogPath, message);
    console.error(message);
};

process.on("unhandledRejection", (reason) => {
    logRuntimeEvent("Unhandled Rejection", reason);
});

process.on("uncaughtException", (error) => {
    logRuntimeEvent("Uncaught Exception", error);
});

process.on("warning", (warning) => {
    logRuntimeEvent("Process Warning", warning);
});

process.on("SIGINT", async () => {
    logRuntimeEvent("Process Signal", "Received SIGINT");
    await shutdownPool();
    process.exit(0);
});

process.on("SIGTERM", async () => {
    logRuntimeEvent("Process Signal", "Received SIGTERM");
    await shutdownPool();
    process.exit(0);
});

process.on("exit", (code) => {
    logRuntimeEvent("Process Exit", `Node process exited with code ${code}`);
});

const uploadsDir = process.env.USER_DATA_PATH
    ? path.join(process.env.USER_DATA_PATH, "uploads")
    : path.join(__dirname, "uploads");

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(uploadsDir));

app.use("/api/auth", authRoutes);
app.use("/api/super-admin", superAdminRoutes);
app.use("/api/ration-category", rationCategoryRoutes);
app.use("/api/ration-unit", rationUnitRoutes);
app.use("/api/ration-item", rationItemRoutes);
app.use("/api/ration-supplier", rationSupplierRoutes);
app.use("/api/ration-purchase", rationPurchaseRoutes);
app.use("/api/ration-current-stock", rationCurrentStockRoutes);
app.use("/api/ration-kitchen-request", rationKitchenRequestRoutes);
app.use("/api/ration-stock-issue", rationStockIssueRoutes);
app.use("/api/ration-stock-adjustment", rationStockAdjustmentRoutes);
app.use("/api/ration-stock-audit", rationStockAuditRoutes);
app.use("/api/ration-inventory-dashboard", rationInventoryDashboardRoutes);

app.post("/", (req, res) => {
    res.send("Backend is running");
});

const port = process.env.PORT || 5000;

const startServer = async () => {
    console.time("startup.total");

    if (shouldInitDatabaseOnStartup) {
        console.time("startup.initDatabase");
        await initDatabase();
        console.timeEnd("startup.initDatabase");
    }

    console.time("startup.listen");
    const server = app.listen(port, () => {
        console.timeEnd("startup.listen");
        console.timeEnd("startup.total");
        console.log(`Server running on port ${port}`);
    });

    server.on("error", (error) => {
        logRuntimeEvent("HTTP Server Error", error);
    });
};

startServer().catch((error) => {
    logRuntimeEvent("Startup failed", error);
    process.exit(1);
});
