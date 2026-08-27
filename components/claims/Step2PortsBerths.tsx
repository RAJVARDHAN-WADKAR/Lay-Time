"use client";

import React from "react";
import { Berth, Port } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/inputs";
import { EmptyState } from "@/components/ui/empty-state";
import { Anchor, Plus, Trash2, Layers, Ship, PlusCircle } from "lucide-react";

interface Step2PortsBerthsProps {
  ports: Port[];
  setPorts: React.Dispatch<React.SetStateAction<Port[]>>;
}

export function Step2PortsBerths({ ports, setPorts }: Step2PortsBerthsProps) {
  const handleAddPort = () => {
    const newPortId = `port-${Date.now()}`;
    const newPort: Port = {
      id: newPortId,
      claimId: "",
      name: "",
      portType: "Discharge Port",
      loadRate: 0,
      berths: [
        {
          id: `berth-${Date.now()}-1`,
          portId: newPortId,
          name: "",
          quantity: 0,
          prorataShare: 100,
          isProrataOverridden: false,
          loadRate: 0,
        },
      ],
    };
    setPorts((prev) => [...prev, newPort]);
  };

  const handleRemovePort = (portId: string) => {
    setPorts((prev) => prev.filter((p) => p.id !== portId));
  };

  const handleUpdatePort = (portId: string, updates: Partial<Port>) => {
    setPorts((prev) =>
      prev.map((p) => (p.id === portId ? { ...p, ...updates } : p))
    );
  };

  const handleAddBerth = (portId: string) => {
    setPorts((prev) =>
      prev.map((p) => {
        if (p.id !== portId) return p;
        const newBerth: Berth = {
          id: `berth-${Date.now()}-${p.berths.length + 1}`,
          portId,
          name: "",
          quantity: 0,
          prorataShare: 100,
          isProrataOverridden: false,
          loadRate: p.loadRate || 0,
        };
        return { ...p, berths: [...p.berths, newBerth] };
      })
    );
  };

  const handleRemoveBerth = (portId: string, berthId: string) => {
    setPorts((prev) =>
      prev.map((p) => {
        if (p.id !== portId) return p;
        return {
          ...p,
          berths: p.berths.filter((b) => b.id !== berthId),
        };
      })
    );
  };

  const handleUpdateBerth = (
    portId: string,
    berthId: string,
    updates: Partial<Berth>
  ) => {
    setPorts((prev) =>
      prev.map((p) => {
        if (p.id !== portId) return p;
        return {
          ...p,
          berths: p.berths.map((b) =>
            b.id === berthId ? { ...b, ...updates } : b
          ),
        };
      })
    );
  };

  return (
    <div className="space-y-6 text-xs text-left">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <Anchor className="h-4 w-4 text-blue-600" />
            <span>Port Itinerary & Berth Allocations</span>
          </h3>
          <p className="text-slate-500 text-[11px] mt-0.5">
            Configure loading and discharging ports, berth allocations, cargo quantities, and prorata percentages.
          </p>
        </div>

        <Button
          type="button"
          size="sm"
          onClick={handleAddPort}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9 px-3.5 rounded-xl flex items-center space-x-1.5"
        >
          <Plus className="h-4 w-4" />
          <span>Add Port</span>
        </Button>
      </div>

      {/* Ports List */}
      {ports.length > 0 ? (
        <div className="space-y-6">
          {ports.map((port, portIndex) => (
            <div
              key={port.id}
              className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4"
            >
              {/* Port Header & General Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <span className="h-6 w-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                    {portIndex + 1}
                  </span>
                  <span className="font-bold text-slate-900 text-sm">
                    {port.name || `Port ${portIndex + 1}`}
                  </span>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemovePort(port.id)}
                  className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 text-xs h-8 px-2"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  <span>Remove Port</span>
                </Button>
              </div>

              {/* Port Details Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Port Name */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Port Name</label>
                  <Input
                    placeholder="e.g. Port of Rotterdam"
                    value={port.name}
                    onChange={(e) =>
                      handleUpdatePort(port.id, { name: e.target.value })
                    }
                  />
                </div>

                {/* Port Type */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Port Type</label>
                  <Select
                    value={port.portType}
                    onChange={(e) =>
                      handleUpdatePort(port.id, {
                        portType: e.target.value as any,
                      })
                    }
                  >
                    <option value="Load Port">Load Port</option>
                    <option value="Discharge Port">Discharge Port</option>
                  </Select>
                </div>

                {/* Default Load Rate */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">
                    Default Load Rate (MT/day)
                  </label>
                  <Input
                    type="number"
                    placeholder="e.g. 45000"
                    value={port.loadRate || ""}
                    onChange={(e) =>
                      handleUpdatePort(port.id, {
                        loadRate: Number(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>

              {/* Berths Sub-table for this Port */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 uppercase text-[10px] tracking-wider flex items-center space-x-1.5">
                    <Layers className="h-3.5 w-3.5 text-slate-400" />
                    <span>Berths & Terminals ({port.berths.length})</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => handleAddBerth(port.id)}
                    className="text-blue-600 hover:text-blue-700 font-semibold text-xs flex items-center space-x-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Berth</span>
                  </button>
                </div>

                {port.berths.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border border-slate-200 rounded-xl overflow-hidden">
                      <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="py-2.5 px-3">Berth Name</th>
                          <th className="py-2.5 px-3">Quantity (MT)</th>
                          <th className="py-2.5 px-3">Prorata (%)</th>
                          <th className="py-2.5 px-3">Load Rate (MT/day)</th>
                          <th className="py-2.5 px-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                        {port.berths.map((berth) => (
                          <tr key={berth.id}>
                            <td className="p-2">
                              <Input
                                placeholder="e.g. Jetty 4"
                                value={berth.name}
                                onChange={(e) =>
                                  handleUpdateBerth(port.id, berth.id, {
                                    name: e.target.value,
                                  })
                                }
                                className="h-8 text-xs"
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                type="number"
                                placeholder="e.g. 50000"
                                value={berth.quantity || ""}
                                onChange={(e) =>
                                  handleUpdateBerth(port.id, berth.id, {
                                    quantity: Number(e.target.value) || 0,
                                  })
                                }
                                className="h-8 text-xs"
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                type="number"
                                placeholder="100"
                                value={berth.prorataShare ?? 100}
                                onChange={(e) =>
                                  handleUpdateBerth(port.id, berth.id, {
                                    prorataShare: Number(e.target.value) || 100,
                                  })
                                }
                                className="h-8 text-xs"
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                type="number"
                                placeholder="45000"
                                value={berth.loadRate || ""}
                                onChange={(e) =>
                                  handleUpdateBerth(port.id, berth.id, {
                                    loadRate: Number(e.target.value) || 0,
                                  })
                                }
                                className="h-8 text-xs"
                              />
                            </td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveBerth(port.id, berth.id)}
                                className="text-slate-400 hover:text-rose-600 p-1 transition"
                                title="Remove Berth"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                    No berths added to this port. Click &quot;Add Berth&quot; above.
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-8">
          <EmptyState
            icon={Anchor}
            title="No ports added yet"
            description="Add the loading and discharging ports for this voyage claim along with berth allocations."
            actionText="Add First Port"
            onAction={handleAddPort}
          />
        </div>
      )}
    </div>
  );
}
