const { DatabaseSync } = require("node:sqlite");
const path = require("path");
const { AsyncLocalStorage } = require("async_hooks");

// Request context storage for tracing HTTP request details in query logs
const contextStorage = new AsyncLocalStorage();

// Resolve database path: use electron user data folder if available, or fall back to backend root
const dbPath = process.env.USER_DATA_PATH 
    ? path.join(process.env.USER_DATA_PATH, "inventory.db")
    : path.join(__dirname, "..", "inventory.db");

require("fs").mkdirSync(path.dirname(dbPath), { recursive: true });

console.log("Database connection opening at:", dbPath);
const db = new DatabaseSync(dbPath);

// Enable SQLite performance pragmas
db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
`);

// Register custom regexp function to evaluate Postgres ~* matches case-insensitively
db.function("regexp", (regex, text) => {
    if (text === null || text === undefined) return 0;
    try {
        const re = new RegExp(regex, "i");
        return re.test(text) ? 1 : 0;
    } catch (err) {
        return 0;
    }
});

db.function("regexp_replace", (text, pattern, replacement, flags = "") => {
    if (text === null || text === undefined) return null;

    try {
        const jsFlags = String(flags).includes("g") ? "g" : "";
        return String(text).replace(new RegExp(pattern, jsFlags), replacement);
    } catch (err) {
        return String(text);
    }
});

/**
 * Translates Postgres SQL query semantics to SQLite syntax dynamically
 */
function translateQuery(sql, values) {
    if (typeof sql !== "string") return { sql, values };

    let translated = sql;

    // 1. Translate PostgreSQL placeholders ($1, $2, ...) to SQLite (?1, ?2, ...)
    translated = translated.replace(/\$(\d+)/g, "?$1");

    // 2. Translate case-insensitive regular expression match (~*) to SQLite REGEXP operator
    translated = translated.replace(/~\*/g, "REGEXP");

    // 3. Translate case-insensitive LIKE to SQLite's LIKE. SQLite LIKE is case-insensitive for ASCII by default.
    translated = translated.replace(/\bILIKE\b/gi, "LIKE");

    // 4. Translate Postgres date truncation used by dashboards.
    translated = translated.replace(/DATE_TRUNC\(\s*'month'\s*,\s*CURRENT_DATE\s*\)/gi, "date('now', 'start of month')");
    translated = translated.replace(/DATE_TRUNC\(\s*'month'\s*,\s*([^)]+?)\s*\)/gi, "date($1, 'start of month')");

    // 5. Remove Postgres specific type casting ::integer, ::numeric(12,2), ::text, etc.
    translated = translated.replace(/::[a-zA-Z0-9_]+(?:\([^)]*\))?/g, "");

    // 6. Translate GREATEST(a, b, ...) to SQLite MAX(a, b, ...)
    translated = translated.replace(/\bGREATEST\b/gi, "MAX");
    translated = translated.replace(/\bLEAST\b/gi, "MIN");

    return { sql: translated, values };
}

function normalizeValues(values) {
    if (values === undefined || values === null) return [];
    return Array.isArray(values) ? values : [values];
}

function toPlainRows(rows) {
    return rows.map((row) => ({ ...row }));
}

/**
 * Executes a query on the SQLite database, mimicking the PostgreSQL return shape
 */
const query = async (config, values) => {
    let sqlText = "";
    let sqlValues = [];
    let queryName = "unnamed-query";

    // Handle query signature
    if (typeof config === "string") {
        sqlText = config;
        sqlValues = normalizeValues(values);
    } else if (config && typeof config === "object") {
        sqlText = config.text || "";
        sqlValues = normalizeValues(config.values);
        queryName = config.name || "unnamed-query";
    }

    const { sql: translatedSql, values: translatedValues } = translateQuery(sqlText, sqlValues);

    const store = contextStorage.getStore();
    const requestId = store?.requestId || "N/A";
    const method = store?.method || "N/A";
    const requestUrl = store?.url || "N/A";

    const startTime = process.hrtime();

    try {
        const isSelect = translatedSql.trim().toUpperCase().startsWith("SELECT") || 
                         translatedSql.trim().toUpperCase().startsWith("WITH") ||
                         translatedSql.trim().toUpperCase().includes("RETURNING");

        let rows = [];
        let info = null;

        if (isSelect) {
            rows = toPlainRows(db.prepare(translatedSql).all(...normalizeValues(translatedValues)));
        } else {
            info = db.prepare(translatedSql).run(...normalizeValues(translatedValues));
            rows = [{ id: info.lastInsertRowid }];
        }

        const diff = process.hrtime(startTime);
        const durationMs = (diff[0] * 1000 + diff[1] / 1000000).toFixed(2);

        console.log(`[SQLite Query] name="${queryName}" duration=${durationMs}ms requestId="${requestId}" method="${method}" url="${requestUrl}"`);

        return {
            rows,
            rowCount: info ? info.changes : rows.length,
            lastInsertRowid: info ? info.lastInsertRowid : null,
            changes: info ? info.changes : 0
        };
    } catch (err) {
        const diff = process.hrtime(startTime);
        const durationMs = (diff[0] * 1000 + diff[1] / 1000000).toFixed(2);

        console.error(`[SQLite Query Failed] name="${queryName}" duration=${durationMs}ms requestId="${requestId}" method="${method}" url="${requestUrl}" errorMessage="${err.message}" sql="${translatedSql}"`);
        throw err;
    }
};

/**
 * Controlled transaction execution helper mimicking Postgres pool.connect()
 */
const transaction = async (callback) => {
    const client = {
        query: async (config, values) => {
            return query(config, values);
        }
    };

    db.exec("BEGIN IMMEDIATE");
    try {
        const result = await callback(client);
        db.exec("COMMIT");
        return result;
    } catch (error) {
        try {
            db.exec("ROLLBACK");
        } catch (rbErr) {
            console.error("[SQLite Transaction Rollback Failed] Error:", rbErr.message);
        }
        throw error;
    }
};

/**
 * Health check endpoint
 */
const healthCheck = async () => {
    try {
        return db.prepare("SELECT 1").get() !== undefined;
    } catch (err) {
        console.error("SQLite health check failed:", err.message);
        return false;
    }
};

/**
 * Shutdown database gracefully
 */
const shutdownPool = async () => {
    console.log("Closing SQLite database connection...");
    try {
        db.close();
        console.log("SQLite database closed successfully.");
    } catch (err) {
        console.error("Error closing SQLite database:", err.message);
    }
};

module.exports = {
    query,
    transaction,
    healthCheck,
    shutdownPool,
    contextStorage
};
