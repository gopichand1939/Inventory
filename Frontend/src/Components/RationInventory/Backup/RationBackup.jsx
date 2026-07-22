import { useState } from "react";
import { Database, Download, Upload, AlertTriangle, CheckCircle, HelpCircle } from "lucide-react";

import Navbar from "../../Layout/Navbar";
import Sidebar from "../../Layout/Sidebar";

const RationBackup = () => {
  const [loading, setLoading] = useState(false);
  const [actionType, setActionType] = useState(""); // "backup" or "restore"
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);

  const handleBackup = async () => {
    setLoading(true);
    setError("");
    setSuccessMessage("");
    setActionType("backup");

    try {
      if (!window.electronAPI || !window.electronAPI.backupDatabase) {
        throw new Error("Electron API is not available. Please make sure the app is running in the desktop container.");
      }

      const result = await window.electronAPI.backupDatabase();
      if (result.success) {
        setSuccessMessage(`Database backup created successfully!\nSaved to: ${result.filePath}`);
      } else {
        if (result.message !== "Backup canceled") {
          throw new Error(result.message);
        }
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to create database backup.");
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    setShowRestoreConfirm(false);
    setLoading(true);
    setError("");
    setSuccessMessage("");
    setActionType("restore");

    try {
      if (!window.electronAPI || !window.electronAPI.restoreDatabase) {
        throw new Error("Electron API is not available. Please make sure the app is running in the desktop container.");
      }

      const result = await window.electronAPI.restoreDatabase();
      if (result.success) {
        // App will reload automatically from main.js, but let's set a backup success state just in case
        setSuccessMessage("Database restored successfully! Reloading application...");
      } else {
        if (result.message !== "Restore canceled") {
          throw new Error(result.message);
        }
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to restore database from backup.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
                Database Backup & Restore
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Maintain and protect your local inventory database offline.
              </p>
            </div>

            {/* Notifications */}
            {error && (
              <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-start gap-3">
                <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={18} />
                <div>
                  <h4 className="text-sm font-bold text-red-200">Operation Failed</h4>
                  <p className="text-red-300 text-xs mt-1">{error}</p>
                </div>
              </div>
            )}

            {successMessage && (
              <div className="mb-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-start gap-3">
                <CheckCircle className="text-emerald-400 shrink-0 mt-0.5" size={18} />
                <div>
                  <h4 className="text-sm font-bold text-emerald-200">Success</h4>
                  <pre className="text-emerald-300 text-xs mt-1 whitespace-pre-wrap font-sans leading-relaxed">
                    {successMessage}
                  </pre>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Backup Panel */}
              <div className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-8 flex flex-col justify-between min-h-[300px]">
                <div>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="h-12 w-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
                      <Download size={22} className="text-teal-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">Create Local Backup</h2>
                      <span className="text-xs text-slate-500">Export inventory.db</span>
                    </div>
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed mt-2">
                    Copies your active database snapshot into a separate file. You can save this backup file to your local documents folder, an external USB stick, or a secondary drive. Recommended before audits.
                  </p>
                </div>

                <button
                  onClick={handleBackup}
                  disabled={loading}
                  className="
                    mt-6 w-full flex items-center justify-center gap-2 px-5 py-4 rounded-xl font-bold text-sm
                    bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 hover:from-teal-400 hover:to-emerald-400
                    transition-all duration-200 active:scale-[0.98] disabled:opacity-50 cursor-pointer shadow-lg shadow-teal-500/5
                  "
                >
                  {loading && actionType === "backup" ? (
                    <>
                      <div className="animate-spin h-5 w-5 border-2 border-slate-950 border-t-transparent rounded-full" />
                      <span>Writing backup file...</span>
                    </>
                  ) : (
                    <>
                      <Download size={16} />
                      <span>Generate Database Backup</span>
                    </>
                  )}
                </button>
              </div>

              {/* Restore Panel */}
              <div className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-8 flex flex-col justify-between min-h-[300px]">
                <div>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                      <Upload size={22} className="text-amber-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">Restore from Backup</h2>
                      <span className="text-xs text-slate-500">Import inventory.db</span>
                    </div>
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed mt-2 text-amber-200/70">
                    Restores database records by overwriting your active database with an existing backup (.db) file. 
                    <strong className="text-amber-400 block mt-1">Warning: All current transactions and modifications will be replaced.</strong>
                  </p>
                </div>

                <button
                  onClick={() => setShowRestoreConfirm(true)}
                  disabled={loading}
                  className="
                    mt-6 w-full flex items-center justify-center gap-2 px-5 py-4 rounded-xl font-bold text-sm
                    bg-slate-800 border border-slate-700 text-amber-300 hover:bg-slate-700/80 hover:text-white
                    transition-all duration-200 active:scale-[0.98] disabled:opacity-50 cursor-pointer shadow-lg
                  "
                >
                  {loading && actionType === "restore" ? (
                    <>
                      <div className="animate-spin h-5 w-5 border-2 border-amber-400 border-t-transparent rounded-full" />
                      <span>Restoring database...</span>
                    </>
                  ) : (
                    <>
                      <Upload size={16} />
                      <span>Restore Database from File</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Instruction Help Cards */}
            <div className="mt-8 bg-slate-900/20 border border-slate-850 p-6 rounded-2xl flex gap-4">
              <HelpCircle className="text-slate-500 shrink-0 mt-0.5" size={20} />
              <div className="text-xs text-slate-400 leading-relaxed">
                <h4 className="font-bold text-slate-350 mb-1">Ration Database Maintenance Notes</h4>
                <ul className="list-disc pl-4 space-y-1 mt-1 text-slate-400">
                  <li>Since the application runs 100% offline, backups are stored entirely on your computer's storage. There is no cloud storage.</li>
                  <li>We recommend copying your database backups to an external USB flash drive occasionally to safeguard against host computer hardware failure.</li>
                  <li>The restored file replaces the database instantly and triggers a clean interface hot-reload to render your restored dataset.</li>
                </ul>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Confirmation Modal for Restore */}
      {showRestoreConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-400 mb-4">
              <AlertTriangle size={24} />
              <h3 className="text-lg font-bold text-white">Confirm Overwrite</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-6">
              Are you sure you want to restore the database? This action will permanently overwrite your active inventory database with the selected backup file. The application will reload automatically to apply changes.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowRestoreConfirm(false)}
                className="px-5 py-3 rounded-xl text-xs font-semibold bg-transparent hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleRestore}
                className="px-5 py-3 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer shadow-lg shadow-amber-500/10"
              >
                Overwite & Restore
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RationBackup;
