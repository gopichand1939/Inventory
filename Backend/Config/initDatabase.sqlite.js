const { DatabaseSync } = require("node:sqlite");
const path = require("path");
const bcrypt = require("bcryptjs");

const dbPath = process.env.USER_DATA_PATH 
    ? path.join(process.env.USER_DATA_PATH, "inventory.db")
    : path.join(__dirname, "..", "inventory.db");

require("fs").mkdirSync(path.dirname(dbPath), { recursive: true });

const initDatabase = async () => {
    console.log("Initializing SQLite database at:", dbPath);
    const db = new DatabaseSync(dbPath);

    // Enable foreign keys
    db.exec(`
        PRAGMA foreign_keys = ON;
        PRAGMA journal_mode = WAL;
        PRAGMA synchronous = NORMAL;
    `);

    // 1. Create tables
    db.exec(`
        CREATE TABLE IF NOT EXISTS institutions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            institution_name TEXT NOT NULL,
            institution_code TEXT UNIQUE,
            institution_type TEXT,
            email TEXT,
            phone TEXT,
            address TEXT,
            city TEXT,
            state TEXT,
            pincode TEXT,
            manager_name TEXT,
            manager_phone TEXT,
            logo TEXT,
            status TEXT DEFAULT 'active',
            created_by INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS super_admins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            institution_id INTEGER,
            pg_admin_id INTEGER,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            phone TEXT NOT NULL,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'admin',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS user_credentials (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL CHECK (role IN ('super_admin', 'pg_admin')),
            institution_id INTEGER,
            super_admin_id INTEGER,
            pg_admin_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
            FOREIGN KEY (super_admin_id) REFERENCES super_admins(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS meal_type_master (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            institution_id INTEGER NOT NULL,
            meal_type_name TEXT NOT NULL,
            meal_type_code TEXT NOT NULL,
            display_order INTEGER NOT NULL,
            start_time TEXT,
            end_time TEXT,
            description TEXT,
            is_active INTEGER DEFAULT 1,
            is_deleted INTEGER DEFAULT 0,
            created_by INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_by INTEGER,
            updated_at DATETIME,
            FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS urmg_actions (
            action_id INTEGER PRIMARY KEY,
            action_name TEXT NOT NULL UNIQUE,
            priority INTEGER DEFAULT 1,
            status INTEGER DEFAULT 1,
            inst_id INTEGER DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS urmg_menus (
            menu_id INTEGER PRIMARY KEY,
            parent_menu_id INTEGER,
            module_id INTEGER DEFAULT 1,
            menu_name TEXT NOT NULL,
            priority INTEGER DEFAULT 1,
            status INTEGER DEFAULT 1,
            inst_id INTEGER DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS urmg_menu_actions (
            menu_id INTEGER,
            action_id INTEGER,
            priority INTEGER DEFAULT 1,
            status INTEGER DEFAULT 1,
            inst_id INTEGER DEFAULT 1,
            PRIMARY KEY (menu_id, action_id),
            FOREIGN KEY (menu_id) REFERENCES urmg_menus(menu_id) ON DELETE CASCADE,
            FOREIGN KEY (action_id) REFERENCES urmg_actions(action_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS urmg_profile_menus_actions (
            profile_id INTEGER,
            menu_id INTEGER,
            action_id INTEGER,
            is_configuration_only INTEGER DEFAULT 2,
            status INTEGER DEFAULT 1,
            inst_id INTEGER DEFAULT 1,
            PRIMARY KEY (profile_id, menu_id, action_id),
            FOREIGN KEY (menu_id, action_id) REFERENCES urmg_menu_actions(menu_id, action_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS urmg_user_menu_restrictions (
            restriction_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            menu_id INTEGER,
            action_id INTEGER,
            is_allowed INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (user_id, menu_id, action_id),
            FOREIGN KEY (menu_id) REFERENCES urmg_menus(menu_id) ON DELETE CASCADE,
            FOREIGN KEY (action_id) REFERENCES urmg_actions(action_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS ration_item_categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            institution_id INTEGER NOT NULL,
            pg_admin_id INTEGER,
            category_name TEXT NOT NULL,
            category_code TEXT,
            description TEXT,
            status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
            created_by INTEGER,
            updated_by INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (institution_id, category_name),
            UNIQUE (institution_id, category_code),
            FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS ration_units (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            institution_id INTEGER NOT NULL,
            pg_admin_id INTEGER,
            unit_name TEXT NOT NULL,
            unit_code TEXT NOT NULL,
            allow_decimal INTEGER DEFAULT 1,
            description TEXT,
            status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
            created_by INTEGER,
            updated_by INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (institution_id, unit_name),
            UNIQUE (institution_id, unit_code),
            FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS ration_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            institution_id INTEGER NOT NULL,
            pg_admin_id INTEGER,
            item_name TEXT NOT NULL,
            item_code TEXT NOT NULL,
            sku_id TEXT NOT NULL,
            barcode TEXT NOT NULL,
            category_id INTEGER NOT NULL,
            unit_id INTEGER NOT NULL,
            description TEXT,
            image_url TEXT,
            minimum_stock REAL DEFAULT 0,
            maximum_stock REAL,
            reorder_quantity REAL,
            default_purchase_price REAL DEFAULT 0,
            gst_percentage REAL DEFAULT 0,
            batch_tracking INTEGER DEFAULT 0,
            expiry_tracking INTEGER DEFAULT 0,
            status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
            created_by INTEGER,
            updated_by INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (institution_id, item_code),
            UNIQUE (institution_id, barcode),
            UNIQUE (institution_id, sku_id),
            FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
            FOREIGN KEY (category_id) REFERENCES ration_item_categories(id) ON DELETE RESTRICT,
            FOREIGN KEY (unit_id) REFERENCES ration_units(id) ON DELETE RESTRICT
        );

        CREATE TABLE IF NOT EXISTS ration_sku_sequences (
            institution_id INTEGER PRIMARY KEY,
            last_number INTEGER NOT NULL DEFAULT 0,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS ration_suppliers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            institution_id INTEGER NOT NULL,
            pg_admin_id INTEGER,
            supplier_name TEXT NOT NULL,
            supplier_code TEXT NOT NULL,
            contact_person TEXT,
            phone TEXT NOT NULL,
            alternate_phone TEXT,
            email TEXT,
            gst_number TEXT,
            pan_number TEXT,
            address TEXT,
            city TEXT,
            state TEXT,
            pincode TEXT,
            payment_terms TEXT,
            description TEXT,
            status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
            created_by INTEGER,
            updated_by INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (institution_id, supplier_name),
            UNIQUE (institution_id, supplier_code),
            FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS ration_item_batches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            institution_id INTEGER NOT NULL,
            item_id INTEGER NOT NULL,
            batch_number TEXT NOT NULL,
            manufacturing_date TEXT,
            expiry_date TEXT,
            initial_quantity REAL DEFAULT 0,
            remaining_quantity REAL DEFAULT 0,
            status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired')),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (institution_id, item_id, batch_number),
            FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
            FOREIGN KEY (item_id) REFERENCES ration_items(id) ON DELETE RESTRICT
        );

        CREATE TABLE IF NOT EXISTS ration_purchases (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            institution_id INTEGER NOT NULL,
            pg_admin_id INTEGER,
            purchase_number TEXT NOT NULL,
            purchase_date TEXT NOT NULL,
            supplier_id INTEGER NOT NULL,
            supplier_invoice_number TEXT,
            invoice_date TEXT,
            notes TEXT,
            sub_total REAL DEFAULT 0,
            discount_amount REAL DEFAULT 0,
            gst_amount REAL DEFAULT 0,
            other_charges REAL DEFAULT 0,
            round_off REAL DEFAULT 0,
            grand_total REAL DEFAULT 0,
            paid_amount REAL DEFAULT 0,
            balance_amount REAL DEFAULT 0,
            payment_status TEXT DEFAULT 'unpaid',
            status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'completed', 'cancelled')),
            cancellation_reason TEXT,
            version INTEGER DEFAULT 1,
            created_by INTEGER,
            updated_by INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (institution_id, purchase_number),
            FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
            FOREIGN KEY (supplier_id) REFERENCES ration_suppliers(id) ON DELETE RESTRICT
        );

        CREATE TABLE IF NOT EXISTS ration_purchase_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            purchase_id INTEGER NOT NULL,
            item_id INTEGER NOT NULL,
            batch_id INTEGER,
            quantity REAL NOT NULL,
            free_quantity REAL DEFAULT 0,
            received_quantity REAL DEFAULT 0,
            unit_price REAL NOT NULL,
            discount_percentage REAL DEFAULT 0,
            discount_amount REAL DEFAULT 0,
            gst_percentage REAL DEFAULT 0,
            gst_amount REAL DEFAULT 0,
            line_total REAL NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (purchase_id) REFERENCES ration_purchases(id) ON DELETE CASCADE,
            FOREIGN KEY (item_id) REFERENCES ration_items(id) ON DELETE RESTRICT,
            FOREIGN KEY (batch_id) REFERENCES ration_item_batches(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS ration_stock_ledger (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            institution_id INTEGER NOT NULL,
            item_id INTEGER NOT NULL,
            batch_id INTEGER,
            reference_type TEXT NOT NULL,
            reference_id INTEGER NOT NULL,
            reference_number TEXT NOT NULL,
            opening_stock REAL NOT NULL,
            quantity_in REAL DEFAULT 0,
            quantity_out REAL DEFAULT 0,
            closing_stock REAL NOT NULL,
            transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_by INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
            FOREIGN KEY (item_id) REFERENCES ration_items(id) ON DELETE RESTRICT,
            FOREIGN KEY (batch_id) REFERENCES ration_item_batches(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS ration_stock_transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            institution_id INTEGER NOT NULL,
            item_id INTEGER NOT NULL,
            transaction_type TEXT NOT NULL,
            reference_id INTEGER NOT NULL,
            quantity_in REAL DEFAULT 0,
            quantity_out REAL DEFAULT 0,
            batch_number TEXT,
            expiry_date TEXT,
            transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_by INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
            FOREIGN KEY (item_id) REFERENCES ration_items(id) ON DELETE RESTRICT
        );

        CREATE TABLE IF NOT EXISTS ration_purchase_audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            institution_id INTEGER NOT NULL,
            purchase_id INTEGER NOT NULL,
            action TEXT NOT NULL,
            performed_by INTEGER,
            old_values TEXT,
            new_values TEXT,
            remarks TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
            FOREIGN KEY (purchase_id) REFERENCES ration_purchases(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS ration_purchase_sequences (
            institution_id INTEGER PRIMARY KEY,
            last_number INTEGER NOT NULL DEFAULT 0,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS ration_kitchen_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            institution_id INTEGER NOT NULL,
            pg_admin_id INTEGER,
            request_number TEXT NOT NULL,
            request_date TEXT NOT NULL,
            required_date TEXT NOT NULL,
            meal_type_id INTEGER,
            priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
            requested_by INTEGER,
            approved_by INTEGER,
            approval_date DATETIME,
            status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'cancelled', 'completed')),
            remarks TEXT,
            created_by INTEGER,
            updated_by INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (institution_id, request_number),
            FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
            FOREIGN KEY (meal_type_id) REFERENCES meal_type_master(id) ON DELETE RESTRICT,
            FOREIGN KEY (requested_by) REFERENCES user_credentials(id) ON DELETE RESTRICT,
            FOREIGN KEY (approved_by) REFERENCES user_credentials(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS ration_kitchen_request_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            request_id INTEGER NOT NULL,
            institution_id INTEGER NOT NULL,
            item_id INTEGER NOT NULL,
            requested_quantity REAL NOT NULL CHECK (requested_quantity > 0),
            approved_quantity REAL DEFAULT 0 CHECK (approved_quantity >= 0),
            issued_quantity REAL DEFAULT 0 CHECK (issued_quantity >= 0),
            remarks TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (request_id) REFERENCES ration_kitchen_requests(id) ON DELETE CASCADE,
            FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
            FOREIGN KEY (item_id) REFERENCES ration_items(id) ON DELETE RESTRICT
        );

        CREATE TABLE IF NOT EXISTS ration_kitchen_request_sequences (
            institution_id INTEGER PRIMARY KEY,
            last_number INTEGER NOT NULL DEFAULT 0,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS ration_stock_issues (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            institution_id INTEGER NOT NULL,
            pg_admin_id INTEGER,
            issue_number TEXT NOT NULL,
            kitchen_request_id INTEGER NOT NULL,
            issue_date TEXT NOT NULL,
            issued_to INTEGER,
            remarks TEXT,
            status TEXT DEFAULT 'completed' CHECK (status IN ('draft', 'completed', 'cancelled')),
            created_by INTEGER,
            updated_by INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (institution_id, issue_number),
            FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
            FOREIGN KEY (kitchen_request_id) REFERENCES ration_kitchen_requests(id) ON DELETE RESTRICT,
            FOREIGN KEY (issued_to) REFERENCES user_credentials(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS ration_stock_issue_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            stock_issue_id INTEGER NOT NULL,
            institution_id INTEGER NOT NULL,
            kitchen_request_item_id INTEGER NOT NULL,
            item_id INTEGER NOT NULL,
            approved_quantity REAL NOT NULL CHECK (approved_quantity >= 0),
            previously_issued_quantity REAL DEFAULT 0 CHECK (previously_issued_quantity >= 0),
            issue_quantity REAL NOT NULL CHECK (issue_quantity > 0),
            unit_price REAL DEFAULT 0 CHECK (unit_price >= 0),
            batch_number TEXT,
            expiry_date TEXT,
            remarks TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (stock_issue_id) REFERENCES ration_stock_issues(id) ON DELETE CASCADE,
            FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
            FOREIGN KEY (kitchen_request_item_id) REFERENCES ration_kitchen_request_items(id) ON DELETE RESTRICT,
            FOREIGN KEY (item_id) REFERENCES ration_items(id) ON DELETE RESTRICT
        );

        CREATE TABLE IF NOT EXISTS ration_stock_issue_sequences (
            institution_id INTEGER PRIMARY KEY,
            last_number INTEGER NOT NULL DEFAULT 0,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS ration_stock_adjustments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            institution_id INTEGER NOT NULL,
            adjustment_number TEXT NOT NULL,
            adjustment_date TEXT NOT NULL,
            reason TEXT NOT NULL,
            remarks TEXT,
            status TEXT DEFAULT 'completed' CHECK (status IN ('draft', 'completed', 'cancelled')),
            created_by INTEGER,
            approved_by INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (institution_id, adjustment_number),
            FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS ration_stock_adjustment_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            stock_adjustment_id INTEGER NOT NULL,
            institution_id INTEGER NOT NULL,
            item_id INTEGER NOT NULL,
            current_stock REAL NOT NULL CHECK (current_stock >= 0),
            adjustment_quantity REAL NOT NULL CHECK (adjustment_quantity > 0),
            adjustment_direction TEXT NOT NULL CHECK (adjustment_direction IN ('increase', 'decrease')),
            previous_stock REAL NOT NULL CHECK (previous_stock >= 0),
            new_stock REAL NOT NULL CHECK (new_stock >= 0),
            reason TEXT,
            remarks TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (stock_adjustment_id) REFERENCES ration_stock_adjustments(id) ON DELETE CASCADE,
            FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
            FOREIGN KEY (item_id) REFERENCES ration_items(id) ON DELETE RESTRICT
        );

        CREATE TABLE IF NOT EXISTS ration_stock_adjustment_sequences (
            institution_id INTEGER PRIMARY KEY,
            last_number INTEGER NOT NULL DEFAULT 0,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS ration_stock_audits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            institution_id INTEGER NOT NULL,
            audit_number TEXT NOT NULL,
            audit_date TEXT NOT NULL,
            audit_name TEXT NOT NULL,
            remarks TEXT,
            status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'pending', 'approved', 'rejected', 'completed', 'cancelled')),
            created_by INTEGER,
            approved_by INTEGER,
            approved_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (institution_id, audit_number),
            FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS ration_stock_audit_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            audit_id INTEGER NOT NULL,
            institution_id INTEGER NOT NULL,
            item_id INTEGER NOT NULL,
            system_stock REAL NOT NULL,
            physical_stock REAL NOT NULL CHECK (physical_stock >= 0),
            difference_quantity REAL NOT NULL,
            adjustment_direction TEXT CHECK (adjustment_direction IN ('increase', 'decrease')),
            remarks TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (audit_id) REFERENCES ration_stock_audits(id) ON DELETE CASCADE,
            FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
            FOREIGN KEY (item_id) REFERENCES ration_items(id) ON DELETE RESTRICT
        );

        CREATE TABLE IF NOT EXISTS ration_stock_audit_sequences (
            institution_id INTEGER PRIMARY KEY,
            last_number INTEGER NOT NULL DEFAULT 0,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE
        );
    `);

    // 2. Indexes for performance
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_ration_item_batches_item ON ration_item_batches(item_id);
        CREATE INDEX IF NOT EXISTS idx_ration_item_batches_num ON ration_item_batches(institution_id, item_id, batch_number);
        CREATE INDEX IF NOT EXISTS idx_ration_purchases_institution ON ration_purchases(institution_id);
        CREATE INDEX IF NOT EXISTS idx_ration_purchase_items_purchase ON ration_purchase_items(purchase_id);
        CREATE INDEX IF NOT EXISTS idx_ration_stock_ledger_item ON ration_stock_ledger(item_id);
        CREATE INDEX IF NOT EXISTS idx_ration_stock_ledger_batch ON ration_stock_ledger(batch_id);
        CREATE INDEX IF NOT EXISTS idx_ration_stock_transactions_inst_date ON ration_stock_transactions(institution_id, created_at);
        CREATE INDEX IF NOT EXISTS idx_ration_items_inst_status ON ration_items(institution_id, status);
    `);

    // 3. Seed Default Data (Institution & Super Admin)
    const instRow = db.prepare("SELECT id FROM institutions LIMIT 1").get();
    let instId = instRow ? instRow.id : null;

    if (!instId) {
        const stmt = db.prepare(`
            INSERT INTO institutions (institution_name, institution_code, status)
            VALUES (?, ?, ?)
        `);
        const info = stmt.run("Default Ration Institution", "DEFAULT_RATION", "active");
        instId = info.lastInsertRowid;
    }

    const adminRow = db.prepare("SELECT id FROM super_admins WHERE email = ?").get("admin@ration.com");
    if (!adminRow) {
        const hashedPassword = bcrypt.hashSync("admin123", 10);
        
        // Insert Super Admin
        const saStmt = db.prepare(`
            INSERT INTO super_admins (institution_id, name, email, phone, password, role)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        const saInfo = saStmt.run(instId, "Administrator", "admin@ration.com", "1234567890", hashedPassword, "admin");
        const saId = saInfo.lastInsertRowid;

        // Insert User Credential
        const ucStmt = db.prepare(`
            INSERT INTO user_credentials (email, password, role, institution_id, super_admin_id)
            VALUES (?, ?, ?, ?, ?)
        `);
        ucStmt.run("admin@ration.com", hashedPassword, "super_admin", instId, saId);
    }

    // Seed Meal Types
    const mealCount = db.prepare("SELECT COUNT(*) as count FROM meal_type_master").get().count;
    if (mealCount === 0) {
        const insertMeal = db.prepare(`
            INSERT INTO meal_type_master (institution_id, meal_type_name, meal_type_code, display_order, start_time, end_time, description)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        insertMeal.run(instId, "Breakfast", "BREAKFAST", 1, "07:00", "09:30", "Recommended breakfast slot");
        insertMeal.run(instId, "Lunch", "LUNCH", 2, "12:00", "15:00", "Recommended lunch slot");
        insertMeal.run(instId, "Dinner", "DINNER", 3, "19:00", "22:00", "Recommended dinner slot");
    }

    // Seed Menus & Actions
    db.exec(`
        INSERT OR IGNORE INTO urmg_actions (action_id, action_name, priority, status, inst_id)
        VALUES
            (1, 'Create', 1, 1, 1),
            (2, 'Edit', 2, 1, 1),
            (3, 'View', 3, 1, 1),
            (4, 'Delete', 4, 1, 1),
            (5, 'List', 5, 1, 1),
            (6, 'Approve', 6, 1, 1),
            (7, 'Reject', 7, 1, 1);

        INSERT OR IGNORE INTO urmg_menus (menu_id, parent_menu_id, module_id, menu_name, priority, status, inst_id)
        VALUES
            (1, NULL, 1, 'Dashboard', 1, 1, 1),
            (200, NULL, 1, 'Ration Inventory', 7, 1, 1),
            (201, 200, 1, 'Category Master', 1, 1, 1),
            (203, 200, 1, 'Unit Master', 2, 1, 1),
            (202, 200, 1, 'Item Master', 3, 1, 1),
            (204, 200, 1, 'Supplier Master', 4, 1, 1),
            (205, 200, 1, 'Purchases', 5, 1, 1),
            (206, 200, 1, 'Current Stock', 6, 1, 1),
            (207, 200, 1, 'Kitchen Request', 7, 1, 1),
            (208, 200, 1, 'Stock Issue', 8, 1, 1),
            (209, 200, 1, 'Stock Adjustment', 9, 1, 1),
            (210, 200, 1, 'Stock Audit', 10, 1, 1),
            (211, 200, 1, 'Inventory Dashboard', 11, 1, 1),
            (212, 200, 1, 'QR Labels', 12, 1, 1),
            (213, 200, 1, 'Reports', 13, 1, 1),
            (214, 200, 1, 'Backup & Restore', 14, 1, 1),
            (215, 200, 1, 'Settings', 15, 1, 1);

        -- Map actions to Category Master
        INSERT OR IGNORE INTO urmg_menu_actions (menu_id, action_id, priority, status) VALUES (201, 1, 1, 1);
        INSERT OR IGNORE INTO urmg_menu_actions (menu_id, action_id, priority, status) VALUES (201, 2, 2, 1);
        INSERT OR IGNORE INTO urmg_menu_actions (menu_id, action_id, priority, status) VALUES (201, 3, 3, 1);
        INSERT OR IGNORE INTO urmg_menu_actions (menu_id, action_id, priority, status) VALUES (201, 4, 4, 1);
        INSERT OR IGNORE INTO urmg_menu_actions (menu_id, action_id, priority, status) VALUES (201, 5, 5, 1);

        -- Map actions to Unit Master
        INSERT OR IGNORE INTO urmg_menu_actions (menu_id, action_id, priority, status) VALUES (203, 1, 1, 1);
        INSERT OR IGNORE INTO urmg_menu_actions (menu_id, action_id, priority, status) VALUES (203, 2, 2, 1);
        INSERT OR IGNORE INTO urmg_menu_actions (menu_id, action_id, priority, status) VALUES (203, 3, 3, 1);
        INSERT OR IGNORE INTO urmg_menu_actions (menu_id, action_id, priority, status) VALUES (203, 4, 4, 1);
        INSERT OR IGNORE INTO urmg_menu_actions (menu_id, action_id, priority, status) VALUES (203, 5, 5, 1);

        -- Map actions to Item Master
        INSERT OR IGNORE INTO urmg_menu_actions (menu_id, action_id, priority, status) VALUES (202, 1, 1, 1);
        INSERT OR IGNORE INTO urmg_menu_actions (menu_id, action_id, priority, status) VALUES (202, 2, 2, 1);
        INSERT OR IGNORE INTO urmg_menu_actions (menu_id, action_id, priority, status) VALUES (202, 3, 3, 1);
        INSERT OR IGNORE INTO urmg_menu_actions (menu_id, action_id, priority, status) VALUES (202, 4, 4, 1);
        INSERT OR IGNORE INTO urmg_menu_actions (menu_id, action_id, priority, status) VALUES (202, 5, 5, 1);

        -- Map actions to Supplier Master
        INSERT OR IGNORE INTO urmg_menu_actions (menu_id, action_id, priority, status) VALUES (204, 1, 1, 1);
        INSERT OR IGNORE INTO urmg_menu_actions (menu_id, action_id, priority, status) VALUES (204, 2, 2, 1);
        INSERT OR IGNORE INTO urmg_menu_actions (menu_id, action_id, priority, status) VALUES (204, 3, 3, 1);
        INSERT OR IGNORE INTO urmg_menu_actions (menu_id, action_id, priority, status) VALUES (204, 4, 4, 1);
        INSERT OR IGNORE INTO urmg_menu_actions (menu_id, action_id, priority, status) VALUES (204, 5, 5, 1);

        -- Map actions to Purchases
        INSERT OR IGNORE INTO urmg_menu_actions (menu_id, action_id, priority, status) VALUES (205, 1, 1, 1);
        INSERT OR IGNORE INTO urmg_menu_actions (menu_id, action_id, priority, status) VALUES (205, 2, 2, 1);
        INSERT OR IGNORE INTO urmg_menu_actions (menu_id, action_id, priority, status) VALUES (205, 3, 3, 1);
        INSERT OR IGNORE INTO urmg_menu_actions (menu_id, action_id, priority, status) VALUES (205, 4, 4, 1);
        INSERT OR IGNORE INTO urmg_menu_actions (menu_id, action_id, priority, status) VALUES (205, 5, 5, 1);

        -- Map actions to Current Stock
        INSERT OR IGNORE INTO urmg_menu_actions (menu_id, action_id, priority, status) VALUES (206, 3, 1, 1);
        INSERT OR IGNORE INTO urmg_menu_actions (menu_id, action_id, priority, status) VALUES (206, 5, 2, 1);

        -- Map actions to Kitchen Request
        INSERT OR IGNORE INTO urmg_menu_actions (menu_id, action_id, priority, status) VALUES (207, 1, 1, 1);
        INSERT OR IGNORE INTO urmg_menu_actions (menu_id, action_id, priority, status) VALUES (207, 2, 2, 1);
        INSERT OR IGNORE INTO urmg_menu_actions (menu_id, action_id, priority, status) VALUES (207, 3, 3, 1);
        INSERT OR IGNORE INTO urmg_menu_actions (menu_id, action_id, priority, status) VALUES (207, 4, 4, 1);
        INSERT OR IGNORE INTO urmg_menu_actions (menu_id, action_id, priority, status) VALUES (207, 5, 5, 1);
        INSERT OR IGNORE INTO urmg_menu_actions (menu_id, action_id, priority, status) VALUES (207, 6, 6, 1);
        INSERT OR IGNORE INTO urmg_menu_actions (menu_id, action_id, priority, status) VALUES (207, 7, 7, 1);

        -- Map actions to Stock Issue
        INSERT OR IGNORE INTO urmg_menu_actions (menu_id, action_id, priority, status) VALUES (208, 1, 1, 1);
        INSERT OR IGNORE INTO urmg_menu_actions (menu_id, action_id, priority, status) VALUES (208, 2, 2, 1);
        INSERT OR IGNORE INTO urmg_menu_actions (menu_id, action_id, priority, status) VALUES (208, 3, 3, 1);
        INSERT OR IGNORE INTO urmg_menu_actions (menu_id, action_id, priority, status) VALUES (208, 4, 4, 1);
        INSERT OR IGNORE INTO urmg_menu_actions (menu_id, action_id, priority, status) VALUES (208, 5, 5, 1);

        -- Map actions to Stock Adjustment
        INSERT OR IGNORE INTO urmg_menu_actions (menu_id, action_id, priority, status) VALUES (209, 1, 1, 1);
        INSERT OR IGNORE INTO urmg_menu_actions (menu_id, action_id, priority, status) VALUES (209, 2, 2, 1);
        INSERT OR IGNORE INTO urmg_menu_actions (menu_id, action_id, priority, status) VALUES (209, 3, 3, 1);
        INSERT OR IGNORE INTO urmg_menu_actions (menu_id, action_id, priority, status) VALUES (209, 4, 4, 1);
        INSERT OR IGNORE INTO urmg_menu_actions (menu_id, action_id, priority, status) VALUES (209, 5, 5, 1);

        -- Map actions to Stock Audit
        INSERT OR IGNORE INTO urmg_menu_actions (menu_id, action_id, priority, status) VALUES (210, 1, 1, 1);
        INSERT OR IGNORE INTO urmg_menu_actions (menu_id, action_id, priority, status) VALUES (210, 2, 2, 1);
        INSERT OR IGNORE INTO urmg_menu_actions (menu_id, action_id, priority, status) VALUES (210, 3, 3, 1);
        INSERT OR IGNORE INTO urmg_menu_actions (menu_id, action_id, priority, status) VALUES (210, 4, 4, 1);
        INSERT OR IGNORE INTO urmg_menu_actions (menu_id, action_id, priority, status) VALUES (210, 5, 5, 1);

        -- Map actions to Inventory Dashboard
        INSERT OR IGNORE INTO urmg_menu_actions (menu_id, action_id, priority, status) VALUES (211, 3, 1, 1);
        INSERT OR IGNORE INTO urmg_menu_actions (menu_id, action_id, priority, status) VALUES (211, 5, 2, 1);

        -- Map actions to QR Labels
        INSERT OR IGNORE INTO urmg_menu_actions (menu_id, action_id, priority, status) VALUES (212, 3, 1, 1);
        INSERT OR IGNORE INTO urmg_menu_actions (menu_id, action_id, priority, status) VALUES (212, 5, 2, 1);

        -- Map actions to Reports
        INSERT OR IGNORE INTO urmg_menu_actions (menu_id, action_id, priority, status) VALUES (213, 3, 1, 1);
        INSERT OR IGNORE INTO urmg_menu_actions (menu_id, action_id, priority, status) VALUES (213, 5, 2, 1);

        -- Map actions to Backup & Restore
        INSERT OR IGNORE INTO urmg_menu_actions (menu_id, action_id, priority, status) VALUES (214, 3, 1, 1);
        INSERT OR IGNORE INTO urmg_menu_actions (menu_id, action_id, priority, status) VALUES (214, 5, 2, 1);

        -- Map actions to Settings
        INSERT OR IGNORE INTO urmg_menu_actions (menu_id, action_id, priority, status) VALUES (215, 3, 1, 1);
        INSERT OR IGNORE INTO urmg_menu_actions (menu_id, action_id, priority, status) VALUES (215, 2, 2, 1);

        -- Grant permissions to Profile 1 (Super Admin)
        INSERT OR IGNORE INTO urmg_profile_menus_actions (profile_id, menu_id, action_id, is_configuration_only, status)
        SELECT 1, menu_id, action_id, 2, 1 FROM urmg_menu_actions;

        -- Grant permissions to Profile 2 (PG Admin/Regular Admin)
        INSERT OR IGNORE INTO urmg_profile_menus_actions (profile_id, menu_id, action_id, is_configuration_only, status)
        SELECT 2, menu_id, action_id, 2, 1 FROM urmg_menu_actions;
    `);

    db.close();
    console.log("SQLite schema verification and seeding completed successfully.");
};

module.exports = initDatabase;
