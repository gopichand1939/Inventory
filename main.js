const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const fs = require("fs");

let mainWindow = null;
let serverProcess = null;

// Starts the Express server as a child process with appropriate environment variables
function startBackend() {
    console.log("Starting backend Express server...");
    const serverPath = path.join(__dirname, "Backend", "server.js");
    
    serverProcess = spawn(process.env.NODE_EXECUTABLE || "node", [serverPath], {
        env: {
            ...process.env,
            PORT: 5000,
            USER_DATA_PATH: app.getPath("userData"),
            RUN_DB_INIT_ON_STARTUP: "true",
            JWT_SECRET: process.env.JWT_SECRET || "ration_offline_secret_key_12345"
        },
        stdio: "inherit",
        windowsHide: true
    });

    serverProcess.on("exit", (code, signal) => {
        console.log(`Backend Express process exited with code ${code} and signal ${signal}`);
        if (serverProcess && serverProcess.exitCode === code) {
            serverProcess = null;
        }
    });

    serverProcess.on("error", (error) => {
        console.error("Failed to start backend Express process:", error);
    });
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        title: "Ration Inventory Management System",
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, "preload.js")
        }
    });

    // In production, load static files from the built client. In development, load from Vite dev server.
    if (app.isPackaged) {
        mainWindow.loadFile(path.join(__dirname, "Frontend", "dist", "index.html"));
    } else {
        mainWindow.loadURL("http://localhost:5180");
    }

    mainWindow.on("closed", () => {
        mainWindow = null;
    });
}

// Electron bootstrap
app.whenReady().then(() => {
    // 1. Launch background Express API
    startBackend();
    
    // 2. Open desktop Chromium window
    createWindow();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on("window-all-closed", () => {
    // Kill child server process on window close
    if (serverProcess) {
        serverProcess.kill();
        serverProcess = null;
    }
    if (process.platform !== "darwin") {
        app.quit();
    }
});

// IPC Handler: Database Backup
ipcMain.handle("backup-database", async () => {
    if (!mainWindow) return { success: false, message: "No active window" };
    
    const dbSource = path.join(app.getPath("userData"), "inventory.db");
    
    if (!fs.existsSync(dbSource)) {
        return { success: false, message: "Database file not found yet. Create some data first." };
    }

    const result = await dialog.showSaveDialog(mainWindow, {
        title: "Backup Inventory Database",
        defaultPath: path.join(app.getPath("documents"), `ration_inventory_backup_${new Date().toISOString().slice(0, 10)}.db`),
        filters: [{ name: "SQLite Database", extensions: ["db"] }]
    });

    if (result.canceled || !result.filePath) {
        return { success: false, message: "Backup canceled" };
    }

    try {
        fs.copyFileSync(dbSource, result.filePath);
        return { success: true, filePath: result.filePath };
    } catch (err) {
        console.error("Backup failed:", err);
        return { success: false, message: `Backup failed: ${err.message}` };
    }
});

// IPC Handler: Database Restore (Safe lock-free replacement)
ipcMain.handle("restore-database", async () => {
    if (!mainWindow) return { success: false, message: "No active window" };

    const dbDest = path.join(app.getPath("userData"), "inventory.db");

    const result = await dialog.showOpenDialog(mainWindow, {
        title: "Restore Inventory Database",
        filters: [{ name: "SQLite Database", extensions: ["db"] }],
        properties: ["openFile"]
    });

    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        return { success: false, message: "Restore canceled" };
    }

    const backupPath = result.filePaths[0];

    try {
        // 1. Temporarily terminate Express backend process to release database handles & journal files
        console.log("Stopping server to replace database file...");
        if (serverProcess) {
            serverProcess.kill();
            serverProcess = null;
            await new Promise(r => setTimeout(r, 600)); // allow OS filesystem locks to fully release
        }

        // 2. Perform raw copy
        fs.copyFileSync(backupPath, dbDest);
        console.log("Database file replaced successfully.");

        // 3. Restart Express backend process
        startBackend();
        await new Promise(r => setTimeout(r, 1000)); // wait for database initialization & port binding

        // 4. Force reload main browser window to refresh states
        mainWindow.reload();

        return { success: true };
    } catch (err) {
        console.error("Restore failed:", err);
        // Ensure backend is restarted if something crashes mid-copy
        if (!serverProcess || serverProcess.killed) {
            startBackend();
        }
        return { success: false, message: `Restore failed: ${err.message}` };
    }
});
