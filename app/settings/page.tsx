"use client";

import React, { useState, useEffect } from "react";
import { getSettings, updateSettings, resetSettings, resetAllDataToZero } from "@/lib/api";
import { CalculationAssumptions } from "@/lib/types";
import { DEFAULT_ASSUMPTIONS } from "@/lib/calculations";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/inputs";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useAuth } from "@/lib/context/AuthContext";
import { useToast } from "@/lib/hooks/useToast";
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
} from "lucide-react";

export default function SettingsPage() {
  const { currentUser, setUser } = useAuth();
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

  useEffect(() => {
    async function load() {
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
      setIsLoading(false);
    }
    load();
  }, []);

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

            {/* Working Hours */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Working Hours</label>
              <Select
                value={calcSettings.workingHours || "24 Hours SHINC"}
                onChange={(e) => setCalcSettings((p) => ({ ...p, workingHours: e.target.value }))}
                className="h-9 text-xs"
              >
                <option value="24 Hours SHINC">24 Hours SHINC</option>
                <option value="24 Hours SHEX">24 Hours SHEX</option>
                <option value="8 Hours Standard">8 Hours Standard</option>
                <option value="Weather Working Days">Weather Working Days</option>
              </Select>
            </div>
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
