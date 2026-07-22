import { useState, useEffect } from "react";
import { Settings, ShieldAlert, Building, Save, KeyRound, CheckCircle, AlertCircle } from "lucide-react";

import Navbar from "../../Layout/Navbar";
import Sidebar from "../../Layout/Sidebar";
import { BASE_URL, TOKEN_KEY } from "../../../Utils/Constants";

const RationSettings = () => {
  const [activeTab, setActiveTab] = useState("institution"); // "institution" or "security"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Institution Profile Form State
  const [instForm, setInstForm] = useState({
    institution_name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
  });

  // Password Security Form State
  const [pwdForm, setPwdForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  // Fetch current institution details on mount
  useEffect(() => {
    const fetchInstitution = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${BASE_URL}/super-admin/settings/institution`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
          },
        });
        const data = await response.json();
        if (response.ok && data.success) {
          const inst = data.institution || {};
          setInstForm({
            institution_name: inst.institution_name || "",
            email: inst.email || "",
            phone: inst.phone || "",
            address: inst.address || "",
            city: inst.city || "",
            state: inst.state || "",
            pincode: inst.pincode || "",
          });
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchInstitution();
  }, []);

  const handleInstChange = (e) => {
    const { name, value } = e.target;
    setInstForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePwdChange = (e) => {
    const { name, value } = e.target;
    setPwdForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveInstitution = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (!instForm.institution_name) {
      setError("Institution Name is required");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/super-admin/settings/institution`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
        },
        body: JSON.stringify(instForm),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setSuccess("Institution profile updated successfully!");
        setTimeout(() => setSuccess(""), 4000);
      } else {
        throw new Error(data.message || "Failed to update profile");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (!pwdForm.current_password || !pwdForm.new_password) {
      setError("All password fields are required");
      setLoading(false);
      return;
    }

    if (pwdForm.new_password !== pwdForm.confirm_password) {
      setError("New passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/super-admin/settings/change-password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
        },
        body: JSON.stringify({
          current_password: pwdForm.current_password,
          new_password: pwdForm.new_password,
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setSuccess("Administrator password changed successfully!");
        setPwdForm({ current_password: "", new_password: "", confirm_password: "" });
        setTimeout(() => setSuccess(""), 4000);
      } else {
        throw new Error(data.message || "Failed to update password");
      }
    } catch (err) {
      setError(err.message);
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
                System Settings
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Configure your local workspace identity and administrative credentials.
              </p>
            </div>

            {/* Notifications */}
            {error && (
              <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center gap-3">
                <AlertCircle className="text-red-400 shrink-0" size={18} />
                <p className="text-red-300 text-xs">{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-3">
                <CheckCircle className="text-emerald-400 shrink-0" size={18} />
                <p className="text-emerald-200 text-xs">{success}</p>
              </div>
            )}

            {/* Tabs */}
            <div className="flex border-b border-slate-800 mb-8">
              <button
                onClick={() => {
                  setActiveTab("institution");
                  setError("");
                  setSuccess("");
                }}
                className={`
                  flex items-center gap-2 px-6 py-3 font-semibold text-sm cursor-pointer border-b-2 transition-all duration-200
                  ${
                    activeTab === "institution"
                      ? "border-teal-400 text-teal-400 font-bold"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }
                `}
              >
                <Building size={16} />
                <span>Institution Profile</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab("security");
                  setError("");
                  setSuccess("");
                }}
                className={`
                  flex items-center gap-2 px-6 py-3 font-semibold text-sm cursor-pointer border-b-2 transition-all duration-200
                  ${
                    activeTab === "security"
                      ? "border-teal-400 text-teal-400 font-bold"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }
                `}
              >
                <KeyRound size={16} />
                <span>Change Password</span>
              </button>
            </div>

            {/* Form Panels */}
            {activeTab === "institution" ? (
              <form onSubmit={handleSaveInstitution} className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-8 flex flex-col gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2 md:col-span-2">
                    <label className="text-xs font-bold text-slate-400">Institution / Center Name</label>
                    <input
                      type="text"
                      name="institution_name"
                      value={instForm.institution_name}
                      onChange={handleInstChange}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-teal-500"
                      placeholder="e.g. Central Ration Depot"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-400">Official Email</label>
                    <input
                      type="email"
                      name="email"
                      value={instForm.email}
                      onChange={handleInstChange}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-teal-500"
                      placeholder="email@example.com"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-400">Phone / Landline</label>
                    <input
                      type="text"
                      name="phone"
                      value={instForm.phone}
                      onChange={handleInstChange}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-teal-500"
                      placeholder="e.g. +91 98765 43210"
                    />
                  </div>

                  <div className="flex flex-col gap-2 md:col-span-2">
                    <label className="text-xs font-bold text-slate-400">Street Address</label>
                    <input
                      type="text"
                      name="address"
                      value={instForm.address}
                      onChange={handleInstChange}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-teal-500"
                      placeholder="Building, street details"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-400">City</label>
                    <input
                      type="text"
                      name="city"
                      value={instForm.city}
                      onChange={handleInstChange}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-teal-500"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-400">State / Region</label>
                    <input
                      type="text"
                      name="state"
                      value={instForm.state}
                      onChange={handleInstChange}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-teal-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="
                    mt-4 self-end flex items-center justify-center gap-2 px-6 py-4.5 rounded-xl font-bold text-sm
                    bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400
                    text-slate-950 active:scale-[0.98] disabled:opacity-50 cursor-pointer shadow-lg shadow-teal-500/5
                  "
                >
                  <Save size={16} />
                  <span>Save Profile Configuration</span>
                </button>
              </form>
            ) : (
              <form onSubmit={handleChangePassword} className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-8 flex flex-col gap-6 max-w-xl">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-400">Current Administrator Password</label>
                  <input
                    type="password"
                    name="current_password"
                    value={pwdForm.current_password}
                    onChange={handlePwdChange}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-teal-500"
                    placeholder="Enter current password"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-400">New Password</label>
                  <input
                    type="password"
                    name="new_password"
                    value={pwdForm.new_password}
                    onChange={handlePwdChange}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-teal-500"
                    placeholder="Must be at least 6 characters"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-400">Confirm New Password</label>
                  <input
                    type="password"
                    name="confirm_password"
                    value={pwdForm.confirm_password}
                    onChange={handlePwdChange}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-teal-500"
                    placeholder="Re-enter new password"
                  />
                </div>

                <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl flex gap-3 text-xs text-slate-400 leading-relaxed">
                  <ShieldAlert className="text-amber-500 shrink-0 mt-0.5" size={16} />
                  <span>
                    Changing the password updates your single admin credential locally. Make sure to note down the new password immediately, as there are no cloud retrieval mechanisms.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="
                    mt-2 flex items-center justify-center gap-2 px-6 py-4.5 rounded-xl font-bold text-sm
                    bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400
                    text-slate-950 active:scale-[0.98] disabled:opacity-50 cursor-pointer shadow-lg shadow-teal-500/5
                  "
                >
                  <KeyRound size={16} />
                  <span>Update Password</span>
                </button>
              </form>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default RationSettings;
