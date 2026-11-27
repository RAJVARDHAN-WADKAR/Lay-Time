"use client";

import React, { useState, useEffect } from "react";
import { getSettings, updateSettings, resetSettings, resetAllDataToZero } from "@/lib/api";
import { CalculationAssumptions, MaritimeHoliday } from "@/lib/types";
import { DEFAULT_ASSUMPTIONS } from "@/lib/calculations";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/inputs";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useAuth } from "@/lib/context/AuthContext";
import { useToast } from "@/lib/hooks/useToast";
import { NoAccessScreen } from "@/components/auth/NoAccessScreen";
import {
  Settings as SettingsIcon,
  User,
  Building2,
  Calculator,
  Bell,
  Save,
  RotateCcw,
  Trash2,
  ShieldCheck,
  Sparkles,
  AlertOctagon,
} from "lucide-react";

export default function SettingsPage() {
  const { currentUser, setUser, canAccessSettings, role, isLoading: authLoading } = useAuth();
  const { success, info } = useToast();

  // Profile Form State
  const [profile, setProfile] = useState({
    name: currentUser?.name || "User Name",
    email: currentUser?.email || "user@shipping-ops.com",
    username: currentUser?.username || "claimprocessor",
  });

  // Company Form State
  const [company, setCompany] = useState({
    companyName: "Maritime Operations Global Ltd",
    address: "12 Marina Boulevard, Level 38, Singapore 018982",
    contact: "operations@maritime-ops.com",
    phone: "+65 6789 0123",
  });

  // Calculation Settings State
  const [calcSettings, setCalcSettings] = useState<CalculationAssumptions>({
    ...DEFAULT_ASSUMPTIONS,
    currency: "USD",
    defaultDemurrageRate: 25000,
    defaultDespatchRate: 12500,
    workingHours: "24 Hours SHINC",
  });

  // Notification Preferences State
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    claimNotifications: true,
    documentNotifications: true,
    timebarAlerts: true,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

  // Maritime Holidays Calendar Management
  const [holidays, setHolidays] = useState<MaritimeHoliday[]>([]);
  const [holCountryFilter, setHolCountryFilter] = useState("ALL");
  const [newHolCountry, setNewHolCountry] = useState("AE");
  const [newHolDate, setNewHolDate] = useState("");
  const [newHolName, setNewHolName] = useState("");
  const [importYear, setImportYear] = useState(2025);
  const [holBusy, setHolBusy] = useState(false);

  const loadHolidays = async (country = holCountryFilter) => {
    try {
      const qs = country && country !== "ALL" ? `?countryCode=${encodeURIComponent(country)}` : "";
      const res = await fetch(`/api/holidays${qs}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setHolidays(Array.isArray(data.holidays) ? data.holidays : []);
      }
    } catch {}
  };

  useEffect(() => {
    async function load() {
      if (!canAccessSettings) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      const stg = await getSettings();
      setCalcSettings(stg);
      if (stg.companyName) {
        setCompany({
          companyName: stg.companyName || "",
          address: stg.companyAddress || "",
          contact: stg.companyContact || "",
          phone: stg.companyPhone || "",
        });
      }
      await loadHolidays("ALL");
      setIsLoading(false);
    }
    if (!authLoading) {
      load();
    }
  }, [authLoading, canAccessSettings]);

  if (authLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Verifying authorization permissions...</p>
        </div>
      </div>
    );
  }

  if (!canAccessSettings) {
    return <NoAccessScreen message="System settings are strictly restricted to Administrators." />;
  }

  const handleSaveAll = async () => {
    // 1. Save Profile
    if (currentUser) {
      setUser({
        ...currentUser,
        name: profile.name,
        email: profile.email,
        username: profile.username,
      });
    }

    // 2. Save Calculation & Company Settings
    await updateSettings({
      ...calcSettings,
      companyName: company.companyName,
      companyAddress: company.address,
      companyContact: company.contact,
      companyPhone: company.phone,
    });

    success("Settings Saved", "All profile, company, and calculation parameters updated.");
  };

  const handleResetDataToZero = async () => {
    await resetAllDataToZero();
    setIsResetDialogOpen(false);
    success("Zero Data Reset Complete", "All claims, documents, and notifications have been emptied.");
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto text-left text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Settings &amp; Configuration
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage user profile, company details, default laytime parameters, and notification alerts
          </p>
        </div>

        <Button
          onClick={handleSaveAll}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9 px-5 rounded-xl flex items-center space-x-1.5 shadow-xs"
        >
          <Save className="h-4 w-4" />
          <span>Save Changes</span>
        </Button>
      </div>

      {/* 1. SECTION 19: PROFILE */}
      <Card className="border-slate-200 shadow-2xs bg-white rounded-2xl overflow-hidden">
        <CardHeader className="p-5 pb-3 border-b border-slate-100">
          <CardTitle className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <User className="h-4 w-4 text-blue-600" />
            <span>Profile</span>
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Personal account credentials and operator identity
          </CardDescription>
        </CardHeader>

        <CardContent className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Name */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Name</label>
              <Input
                value={profile.name}
                onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                className="h-9 text-xs"
              />
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Email</label>
              <Input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                className="h-9 text-xs"
              />
            </div>

            {/* Username */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Username</label>
              <Input
                value={profile.username}
                onChange={(e) => setProfile((p) => ({ ...p, username: e.target.value }))}
                className="h-9 text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. SECTION 19: COMPANY */}
      <Card className="border-slate-200 shadow-2xs bg-white rounded-2xl overflow-hidden">
        <CardHeader className="p-5 pb-3 border-b border-slate-100">
          <CardTitle className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <Building2 className="h-4 w-4 text-blue-600" />
            <span>Company</span>
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Corporate shipping entity details for reports and settlement files
          </CardDescription>
        </CardHeader>

        <CardContent className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Company Name */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Company Name</label>
              <Input
                value={company.companyName}
                onChange={(e) => setCompany((p) => ({ ...p, companyName: e.target.value }))}
                className="h-9 text-xs"
              />
            </div>

            {/* Contact Email / Phone */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Contact</label>
              <Input
                value={company.contact}
                onChange={(e) => setCompany((p) => ({ ...p, contact: e.target.value }))}
                className="h-9 text-xs"
              />
            </div>

            {/* Address */}
            <div className="space-y-1 sm:col-span-2">
              <label className="font-bold text-slate-700 block">Address</label>
              <Input
                value={company.address}
                onChange={(e) => setCompany((p) => ({ ...p, address: e.target.value }))}
                className="h-9 text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. SECTION 19: CALCULATION SETTINGS */}
      <Card className="border-slate-200 shadow-2xs bg-white rounded-2xl overflow-hidden">
        <CardHeader className="p-5 pb-3 border-b border-slate-100">
          <CardTitle className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <Calculator className="h-4 w-4 text-blue-600" />
            <span>Calculation Settings</span>
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Default commercial terms, currencies, and working hour contractual assumptions
          </CardDescription>
        </CardHeader>

        <CardContent className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Currency */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Currency</label>
              <Select
                value={calcSettings.currency}
                onChange={(e) => setCalcSettings((p) => ({ ...p, currency: e.target.value }))}
                className="h-9 text-xs"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="SGD">SGD (S$)</option>
              </Select>
            </div>

            {/* Default Demurrage Rate */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Default Demurrage Rate</label>
              <Input
                type="number"
                value={calcSettings.defaultDemurrageRate || ""}
                onChange={(e) =>
                  setCalcSettings((p) => ({
                    ...p,
                    defaultDemurrageRate: Number(e.target.value) || 0,
                  }))
                }
                className="h-9 text-xs"
              />
            </div>

            {/* Default Despatch Rate */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Default Despatch Rate</label>
              <Input
                type="number"
                value={calcSettings.defaultDespatchRate || ""}
                onChange={(e) =>
                  setCalcSettings((p) => ({
                    ...p,
                    defaultDespatchRate: Number(e.target.value) || 0,
                  }))
                }
                className="h-9 text-xs"
              />
            </div>

            {/* Working Hours / Default Day Rule */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Default Day Rule</label>
              <Select
                value={calcSettings.weekendRule || "SHEX"}
                onChange={(e) => setCalcSettings((p) => ({ ...p, weekendRule: e.target.value as any }))}
                className="h-9 text-xs"
              >
                <option value="SHINC">SHINC (Sundays &amp; Holidays Included)</option>
                <option value="SHEX">SHEX (Sundays &amp; Holidays Excepted)</option>
                <option value="SHEXUU">SHEXUU (SHEX Unless Used)</option>
                <option value="FHINC">FHINC (Fridays &amp; Holidays Included)</option>
                <option value="FHEX">FHEX (Fridays &amp; Holidays Excepted)</option>
                <option value="FHEXUU">FHEXUU (FHEX Unless Used)</option>
                <option value="SSHEX">SSHEX (Sat/Sun &amp; Holidays Excepted)</option>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 mt-4 border-t border-slate-100">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Default Notice Timebar (Days)</label>
              <Input
                type="number"
                value={calcSettings.defaultNoticeTimebarDays ?? 30}
                onChange={(e) =>
                  setCalcSettings((p) => ({
                    ...p,
                    defaultNoticeTimebarDays: Number(e.target.value) || 30,
                  }))
                }
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Default Formal Claim Timebar (Days)</label>
              <Input
                type="number"
                value={calcSettings.defaultClaimTimebarDays ?? 90}
                onChange={(e) =>
                  setCalcSettings((p) => ({
                    ...p,
                    defaultClaimTimebarDays: Number(e.target.value) || 90,
                  }))
                }
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Notice Grace Period (Hours)</label>
              <Input
                type="number"
                value={calcSettings.noticeGracePeriodHours ?? 6}
                onChange={(e) =>
                  setCalcSettings((p) => ({
                    ...p,
                    noticeGracePeriodHours: Number(e.target.value) || 0,
                  }))
                }
                className="h-9 text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* MARITIME HOLIDAYS CALENDAR (ADMIN) */}
      <Card className="border-slate-200 shadow-2xs bg-white rounded-2xl overflow-hidden">
        <CardHeader className="p-5 pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900">
              Maritime Holiday Calendar (SQLite Authoritative)
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Manage country &amp; port public holidays for SHEX / FHEX / SSHEX laytime exclusions ({holidays.length} loaded)
            </CardDescription>
          </div>
          <Select
            value={holCountryFilter}
            onChange={(e) => {
              const v = e.target.value;
              setHolCountryFilter(v);
              loadHolidays(v);
            }}
            className="h-8 text-xs w-40"
          >
            <option value="ALL">All Countries</option>
            <option value="AE">AE (UAE)</option>
            <option value="SA">SA (Saudi Arabia)</option>
            <option value="SG">SG (Singapore)</option>
            <option value="NL">NL (Netherlands)</option>
            <option value="BE">BE (Belgium)</option>
            <option value="US">US (United States)</option>
            <option value="GB">GB (UK)</option>
            <option value="IN">IN (India)</option>
            <option value="CN">CN (China)</option>
          </Select>
        </CardHeader>
        <CardContent className="p-5 space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Country Code</label>
              <Input
                value={newHolCountry}
                onChange={(e) => setNewHolCountry(e.target.value.toUpperCase())}
                placeholder="e.g. AE"
                className="h-8 text-xs"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Holiday Date</label>
              <Input
                type="date"
                value={newHolDate}
                onChange={(e) => setNewHolDate(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="md:col-span-2">
              <label className="font-bold text-slate-700 block mb-1">Holiday Name</label>
              <Input
                value={newHolName}
                onChange={(e) => setNewHolName(e.target.value)}
                placeholder="e.g. National Day Terminal Holiday"
                className="h-8 text-xs"
              />
            </div>
            <Button
              size="sm"
              disabled={holBusy || !newHolDate || !newHolName}
              onClick={async () => {
                setHolBusy(true);
                try {
                  const res = await fetch("/api/holidays", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      mode: "manual",
                      countryCode: newHolCountry,
                      date: newHolDate,
                      name: newHolName
                    })
                  });
                  if (!res.ok) throw new Error("Failed to save holiday");
                  setNewHolDate("");
                  setNewHolName("");
                  await loadHolidays(holCountryFilter);
                  success("Holiday Added", "Saved to holidays table.");
                } catch (err: any) {
                  info("Holiday Error", err?.message || "Failed");
                } finally {
                  setHolBusy(false);
                }
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs"
            >
              Add Holiday
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
            <span className="font-semibold text-slate-600">Seed Country Year via date-holidays:</span>
            <Input
              type="number"
              value={importYear}
              onChange={(e) => setImportYear(Number(e.target.value) || 2025)}
              className="h-8 w-24 text-xs"
            />
            <Button
              size="sm"
              variant="outline"
              disabled={holBusy}
              onClick={async () => {
                setHolBusy(true);
                try {
                  const res = await fetch("/api/holidays", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      mode: "import",
                      countryCode: newHolCountry,
                      year: importYear
                    })
                  });
                  const d = await res.json();
                  await loadHolidays(holCountryFilter);
                  success("Holidays Imported", `Imported ${d.inserted || 0} holidays for ${newHolCountry} (${importYear}).`);
                } finally {
                  setHolBusy(false);
                }
              }}
              className="h-8 text-xs"
            >
              Import {newHolCountry} ({importYear})
            </Button>
          </div>

          <div className="max-h-52 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
            {holidays.slice(0, 50).map((h) => (
              <div key={h.id} className="px-3 py-2 flex items-center justify-between hover:bg-slate-50">
                <div className="flex items-center space-x-3">
                  <span className="px-1.5 py-0.5 rounded bg-slate-100 font-mono font-bold text-[10px]">
                    {h.countryCode}
                  </span>
                  <span className="font-mono text-slate-600">{h.date}</span>
                  <span className="font-semibold text-slate-800">{h.name}</span>
                  <span className="text-[10px] text-slate-400">({h.source})</span>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await fetch(`/api/holidays?id=${encodeURIComponent(h.id)}`, { method: "DELETE" });
                    await loadHolidays(holCountryFilter);
                    success("Holiday Removed", `${h.name} deleted.`);
                  }}
                  className="text-slate-400 hover:text-rose-600 p-1"
                  title="Delete holiday"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 4. SECTION 19: NOTIFICATION SETTINGS */}
      <Card className="border-slate-200 shadow-2xs bg-white rounded-2xl overflow-hidden">
        <CardHeader className="p-5 pb-3 border-b border-slate-100">
          <CardTitle className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <Bell className="h-4 w-4 text-blue-600" />
            <span>Notification Settings</span>
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Configure system and email notifications for claims, documents, and timebars
          </CardDescription>
        </CardHeader>

        <CardContent className="p-5 space-y-3">
          {/* Email notifications */}
          <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
            <div>
              <span className="font-bold text-slate-800 block text-xs">Email Notifications</span>
              <span className="text-[11px] text-slate-500">
                Receive email alerts for status changes and assigned claim deadlines
              </span>
            </div>
            <input
              type="checkbox"
              checked={notifications.emailNotifications}
              onChange={(e) =>
                setNotifications((p) => ({ ...p, emailNotifications: e.target.checked }))
              }
              className="h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
            />
          </label>

          {/* Claim notifications */}
          <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
            <div>
              <span className="font-bold text-slate-800 block text-xs">Claim Notifications</span>
              <span className="text-[11px] text-slate-500">
                In-app alerts when a new claim is created, updated, or marked for review
              </span>
            </div>
            <input
              type="checkbox"
              checked={notifications.claimNotifications}
              onChange={(e) =>
                setNotifications((p) => ({ ...p, claimNotifications: e.target.checked }))
              }
              className="h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
            />
          </label>

          {/* Document notifications */}
          <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
            <div>
              <span className="font-bold text-slate-800 block text-xs">Document Notifications</span>
              <span className="text-[11px] text-slate-500">
                Alerts when new Statement of Facts or charter documents are uploaded
              </span>
            </div>
            <input
              type="checkbox"
              checked={notifications.documentNotifications}
              onChange={(e) =>
                setNotifications((p) => ({ ...p, documentNotifications: e.target.checked }))
              }
              className="h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
            />
          </label>
        </CardContent>
      </Card>

      {/* 5. DATABASE RESET TO ZERO CONTROLS */}
      <Card className="border-rose-200 shadow-2xs bg-rose-50/30 rounded-2xl overflow-hidden">
        <CardHeader className="p-5 pb-3 border-b border-rose-100">
          <CardTitle className="text-sm font-bold text-rose-900 flex items-center space-x-2">
            <Trash2 className="h-4 w-4 text-rose-600" />
            <span>Database Zero-State Management</span>
          </CardTitle>
          <CardDescription className="text-xs text-rose-700">
            Reset all application data back to a completely clean zero state
          </CardDescription>
        </CardHeader>

        <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="font-bold text-slate-800 text-xs block">Reset System to Zero Data</span>
            <span className="text-[11px] text-slate-500">
              Clears all claims, documents, and notifications to restore empty-state testing.
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsResetDialogOpen(true)}
            className="text-rose-600 border-rose-300 hover:bg-rose-50 font-semibold text-xs h-9 px-4 rounded-xl shrink-0"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            <span>Reset All Data to Zero</span>
          </Button>
        </CardContent>
      </Card>

      {/* Reset Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isResetDialogOpen}
        onClose={() => setIsResetDialogOpen(false)}
        onConfirm={handleResetDataToZero}
        title="Reset All Data to Zero"
        description="Are you sure you want to reset the database to zero? This will permanently delete all claims, documents, and notifications."
        confirmText="Reset Everything"
        destructive
      />
    </div>
  );
}
