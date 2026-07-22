import { useState } from "react";
import { useSelector } from "react-redux";
import { FileSpreadsheet, Download, AlertCircle, FileText, Calendar, Database, Warehouse, BarChart3, HelpCircle } from "lucide-react";

import Navbar from "../../Layout/Navbar";
import Sidebar from "../../Layout/Sidebar";
import { BASE_URL, TOKEN_KEY } from "../../../Utils/Constants";

const REPORT_TYPES = [
  {
    id: "current-stock",
    name: "Current Stock Report",
    description: "Generates a detailed summary of all ration items currently in stock, including code, category, unit, minimum safety stock, default price, and total calculated stock values.",
    icon: Warehouse,
    endpoint: "current-stock",
    filename: "current_stock_report.csv",
  },
  {
    id: "purchase-history",
    name: "Purchase History (Stock In)",
    description: "Logs all purchases completed or drafted from suppliers over time. Includes invoice tracking, purchase numbers, dates, sub-totals, discounts, taxes, and vendor details.",
    icon: FileText,
    endpoint: "purchase-history",
    filename: "purchase_history_report.csv",
  },
  {
    id: "stock-issue",
    name: "Stock Issue History (Stock Out)",
    description: "Tracks ration quantities issued from the warehouse to the kitchen in response to approved kitchen requests, detailing batch distributions, issue numbers, and timestamps.",
    icon: Calendar,
    endpoint: "stock-issue",
    filename: "stock_issue_report.csv",
  },
  {
    id: "stock-adjustment",
    name: "Stock Adjustment Log",
    description: "Lists manual corrections performed by storekeepers to reconcile discrepancies between ledger calculations and physical stock counts (increases or decreases).",
    icon: BarChart3,
    endpoint: "stock-adjustment",
    filename: "stock_adjustment_report.csv",
  },
  {
    id: "stock-audit",
    name: "Stock Audit Records",
    description: "Displays historic physical stock audits, mapping the variance between the system's expected quantity and actual counted inventory per item.",
    icon: Database,
    endpoint: "stock-audit",
    filename: "stock_audit_report.csv",
  },
  {
    id: "low-stock",
    name: "Low Stock Alert Report",
    description: "Filters and displays items whose current inventory levels have fallen below the configured minimum safety stock threshold, prompting reordering.",
    icon: AlertCircle,
    endpoint: "low-stock",
    filename: "low_stock_report.csv",
  },
  {
    id: "expiry-report",
    name: "Batch Expiry Report",
    description: "Exposes batch numbers, manufacturing dates, and expiration dates of items currently in the warehouse, highlighted by active vs. expired batch tracking.",
    icon: AlertCircle,
    endpoint: "expiry-report",
    filename: "expiry_report.csv",
  },
];

const RationReports = () => {
  const { authUser } = useSelector((state) => state.user);
  const [selectedReportIndex, setSelectedReportIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const activeReport = REPORT_TYPES[selectedReportIndex];

  const handleDownload = async () => {
    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) {
        throw new Error("Authentication token not found. Please log in again.");
      }

      const response = await fetch(`${BASE_URL}/ration-reports/${activeReport.endpoint}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to generate CSV report. Server returned error.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = activeReport.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setSuccessMessage(`Successfully downloaded ${activeReport.name}!`);
      setTimeout(() => setSuccessMessage(""), 5000);
    } catch (err) {
      console.error(err);
      setError(err.message || "An unexpected error occurred during file download.");
    } finally {
      setLoading(false);
    }
  };

  const IconComponent = activeReport.icon;

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
                  Local Inventory Reports
                </h1>
                <p className="text-slate-400 text-sm mt-1">
                  Query the local SQLite database and export reports as Excel-compatible CSV files.
                </p>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2.5 flex items-center gap-2">
                <FileSpreadsheet className="text-teal-400" size={18} />
                <span className="text-xs font-semibold text-slate-300">Format: Microsoft Excel CSV</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Report Menu List */}
              <div className="md:col-span-1 bg-slate-900/60 border border-slate-800/80 rounded-3xl p-4 flex flex-col gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 px-3 mb-2">
                  Select Report Type
                </span>
                {REPORT_TYPES.map((report, index) => {
                  const CurrentIcon = report.icon;
                  return (
                    <button
                      key={report.id}
                      onClick={() => {
                        setSelectedReportIndex(index);
                        setError("");
                        setSuccessMessage("");
                      }}
                      className={`
                        w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left text-sm font-semibold
                        transition-all duration-200 cursor-pointer border
                        ${
                          selectedReportIndex === index
                            ? "bg-slate-800 border-slate-700 text-white shadow-lg"
                            : "bg-transparent border-transparent text-slate-400 hover:bg-slate-800/30 hover:text-slate-200"
                        }
                      `}
                    >
                      <CurrentIcon
                        size={18}
                        className={selectedReportIndex === index ? "text-teal-400" : "text-slate-500"}
                      />
                      <span>{report.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Report Detail View & Action Panel */}
              <div className="md:col-span-2 flex flex-col gap-6">
                <div className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-8 flex flex-col justify-between h-full min-h-[320px]">
                  <div>
                    <div className="flex items-center gap-4 mb-6">
                      <div className="h-12 w-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
                        <IconComponent size={24} className="text-teal-400" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white">{activeReport.name}</h2>
                        <span className="text-xs text-slate-500">Destination: Local Downloads</span>
                      </div>
                    </div>

                    <p className="text-slate-300 leading-relaxed text-sm bg-slate-950/40 border border-slate-900 p-5 rounded-2xl">
                      {activeReport.description}
                    </p>
                  </div>

                  <div className="mt-8 pt-6 border-t border-slate-800/40">
                    {/* Error message */}
                    {error && (
                      <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-start gap-3">
                        <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={16} />
                        <p className="text-red-200 text-xs">{error}</p>
                      </div>
                    )}

                    {/* Success message */}
                    {successMessage && (
                      <div className="mb-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-start gap-3">
                        <FileSpreadsheet className="text-emerald-400 shrink-0 mt-0.5" size={16} />
                        <p className="text-emerald-200 text-xs">{successMessage}</p>
                      </div>
                    )}

                    <button
                      onClick={handleDownload}
                      disabled={loading}
                      className="
                        w-full flex items-center justify-center gap-3 px-6 py-4.5 rounded-2xl font-bold text-sm
                        transition-all duration-200 cursor-pointer
                        bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400
                        text-slate-950 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none shadow-xl shadow-teal-500/10
                      "
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin h-5 w-5 border-2 border-slate-950 border-t-transparent rounded-full" />
                          <span>Querying database...</span>
                        </>
                      ) : (
                        <>
                          <Download size={18} />
                          <span>Generate & Save CSV Report</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Helpful instructions */}
                <div className="bg-slate-900/20 border border-slate-850 p-5 rounded-2xl flex gap-3.5">
                  <HelpCircle className="text-slate-500 shrink-0 mt-0.5" size={18} />
                  <div className="text-xs text-slate-400 leading-relaxed">
                    <p className="font-semibold text-slate-300 mb-1">How local reporting works:</p>
                    Once exported, double-click the downloaded CSV file to open it in Microsoft Excel, Google Sheets, or LibreOffice. Since this application operates completely offline, reports are written directly to your Windows system memory stream and saved directly to your local file path.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default RationReports;
