"use client"

import React, { useState, useEffect } from "react"
import { Shield, AlertTriangle, Database, Activity, Globe, Eye, Flame, MapPin } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { dashboardApi } from "@/lib/api"

export default function DashboardView() {
  const [mounted, setMounted] = useState(false)
  const [stats, setStats] = useState<any>(null)
  const [timeline, setTimeline] = useState<any[]>([])
  const [mapPins, setMapPins] = useState<any[]>([])
  
  useEffect(() => {
    setMounted(true)
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const statsData = await dashboardApi.getStats()
      setStats(statsData)
      
      const timelineData = await dashboardApi.getTimeline()
      setTimeline(timelineData)
      
      const pinsData = await dashboardApi.getThreatMap()
      setMapPins(pinsData)
    } catch (e) {
      console.error("Failed to load dashboard data:", e)
    }
  }

  // Fallback calculations if backend is loading or fails
  const totalActors = stats?.total_threat_actors ?? 0
  const activeCampaigns = stats?.active_campaigns ?? 0
  const totalIOCs = stats?.collected_iocs ?? 0
  const criticalIOCs = stats?.risk_alerts?.critical ?? 0

  // Chart data 1: Campaigns target sectors distribution
  const sectorData = [
    { name: "Government", count: 2 },
    { name: "Defense", count: 2 },
    { name: "Finance", count: 3 },
    { name: "Logistics", count: 1 },
    { name: "Retail", count: 1 },
    { name: "Energy", count: 1 }
  ]

  // Chart data 2: Threat Levels of IOCs
  const iocLevelData = [
    { name: "Critical (Risk 90+)", value: criticalIOCs || 1, color: "#F43F5E" },
    { name: "High (Risk 75-89)", value: stats?.risk_alerts?.high || 2, color: "#F59E0B" },
    { name: "Medium (Risk 40-74)", value: stats?.risk_alerts?.medium || 3, color: "#3B82F6" },
    { name: "Low (Risk <40)", value: stats?.risk_alerts?.low || 1, color: "#10B981" }
  ]

  return (
    <div className="space-y-6">
      {/* 1. Statistics Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-card border-border hover:border-accent-blue/30 transition-all shadow-glow-blue">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-foreground/45 uppercase tracking-wider">Threat Actors</span>
              <h3 className="text-3xl font-extrabold text-foreground">{totalActors}</h3>
              <p className="text-[10px] text-accent-emerald font-medium">Monitored Groups</p>
            </div>
            <div className="p-3 bg-accent-blue/10 rounded-lg text-accent-blue">
              <Shield className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border hover:border-accent-blue/30 transition-all shadow-glow-blue">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-foreground/45 uppercase tracking-wider">Active Campaigns</span>
              <h3 className="text-3xl font-extrabold text-foreground">{activeCampaigns}</h3>
              <p className="text-[10px] text-accent-cyan font-medium">Global Campaigns</p>
            </div>
            <div className="p-3 bg-accent-cyan/10 rounded-lg text-accent-cyan">
              <Flame className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border hover:border-accent-blue/30 transition-all shadow-glow-blue">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-foreground/45 uppercase tracking-wider">Collected Entities</span>
              <h3 className="text-3xl font-extrabold text-foreground">{totalIOCs}</h3>
              <p className="text-[10px] text-accent-amber font-medium">IPs, Domains, Hashes</p>
            </div>
            <div className="p-3 bg-accent-amber/10 rounded-lg text-accent-amber">
              <Database className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border hover:border-accent-blue/30 transition-all shadow-glow-blue">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-foreground/45 uppercase tracking-wider">Risk Alerts</span>
              <h3 className="text-3xl font-extrabold text-accent-rose">{criticalIOCs}</h3>
              <p className="text-[10px] text-accent-rose font-medium">Critical (Risk Score &gt;= 90)</p>
            </div>
            <div className="p-3 bg-accent-rose/10 rounded-lg text-accent-rose">
              <AlertTriangle className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. Visual Threat Map & Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* World Map simulator */}
        <div className="lg:col-span-2 bg-card border border-border rounded-lg p-5 flex flex-col justify-between shadow-glow-blue h-[400px]">
          <div className="flex items-center justify-between border-b border-border/40 pb-3 mb-4">
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Globe className="h-4 w-4 text-accent-blue" />
                <span>Global Threat Mapping & C2 Locations</span>
              </h3>
              <p className="text-[11px] text-foreground/45">Visual telemetry of campaign infrastructure and target hosts</p>
            </div>
            <span className="text-[9px] uppercase bg-accent-blue/10 text-accent-blue border border-accent-blue/20 font-bold px-2 py-0.5 rounded">
              Live Feed
            </span>
          </div>

          <div className="relative flex-1 bg-[#090F1B] rounded border border-border/40 overflow-hidden flex items-center justify-center p-2">
            <svg viewBox="0 0 1000 500" className="w-full h-full opacity-65">
              {/* World Map Continent Shapes */}
              <path
                d="M150,150 L220,130 L280,180 L350,160 L380,240 L300,290 L260,380 L180,360 L140,250 Z"
                fill="#1E293B"
                stroke="#334155"
                strokeWidth="1"
              />
              <path
                d="M450,120 L580,110 L680,80 L800,100 L880,180 L850,290 L750,340 L620,380 L520,320 L480,210 Z"
                fill="#1E293B"
                stroke="#334155"
                strokeWidth="1"
              />
              <path
                d="M500,220 L540,250 L530,300 L490,280 Z"
                fill="#1E293B"
                stroke="#334155"
                strokeWidth="1"
              />
              <path
                d="M750,300 L800,320 L820,390 L760,370 Z"
                fill="#1E293B"
                stroke="#334155"
                strokeWidth="1"
              />
              {/* Dynamic Target Coordinates */}
              {mapPins.map((pin, idx) => (
                <g key={idx}>
                  <line
                    x1="450"
                    y1="220"
                    x2={String((pin.lat * 5 + 300) % 1000)}
                    y2={String((pin.lng * 2.5 + 200) % 500)}
                    stroke="#EF4444"
                    strokeWidth="1"
                    strokeDasharray="4,4"
                    opacity="0.4"
                  />
                  <circle
                    cx={String((pin.lat * 5 + 300) % 1000)}
                    cy={String((pin.lng * 2.5 + 200) % 500)}
                    r="4.5"
                    fill={pin.severity === "Critical" ? "#F43F5E" : pin.severity === "High" ? "#F59E0B" : "#3B82F6"}
                    className="animate-pulse"
                  />
                </g>
              ))}
            </svg>
            
            {/* Legend Pins overlays */}
            <div className="absolute bottom-3 left-3 bg-[#0B1220]/95 border border-border/80 p-2 rounded text-[10px] space-y-1.5 shadow-md">
              <div className="flex items-center gap-2">
                <MapPin className="h-3 w-3 text-accent-rose" />
                <span className="text-foreground/80">Critical C2 Nodes</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-3 w-3 text-accent-amber" />
                <span className="text-foreground/80">High Risk Redirectors</span>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline Log Feed */}
        <div className="bg-card border border-border rounded-lg p-5 flex flex-col justify-between shadow-glow-blue h-[400px]">
          <div className="flex items-center justify-between border-b border-border/40 pb-3 mb-4">
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Activity className="h-4 w-4 text-accent-cyan" />
                <span>Threat Activity Log</span>
              </h3>
              <p className="text-[11px] text-foreground/45">Chronological feed of monitored intelligence events</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
            <div className="relative border-l-2 border-border pl-4 space-y-4 py-1 text-xs">
              {timeline.map((event, idx) => (
                <div key={idx} className="relative">
                  <span className={`absolute -left-[21px] top-0.5 h-2.5 w-2.5 rounded-full border-2 border-card ${
                    event.severity === "Critical" ? "bg-accent-rose" : event.severity === "High" ? "bg-accent-amber" : "bg-accent-blue"
                  }`} />
                  <div className="flex justify-between items-center text-[10px] text-foreground/44 font-semibold mb-0.5">
                    <span>{event.event_type}</span>
                    <span>{event.timestamp.slice(5, 10)} {event.timestamp.slice(11, 16)}</span>
                  </div>
                  <h4 className="font-bold text-foreground/95">{event.title}</h4>
                  <p className="text-foreground/60 text-[11.5px] mt-0.5 leading-snug">{event.details}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Charts Area */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-card border border-border shadow-glow-blue h-[280px]">
          <CardHeader className="py-4">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-foreground/50">Target Sectors Distribution</CardTitle>
            <CardDescription className="text-[10px]">Active campaigns targeting industry sectors</CardDescription>
          </CardHeader>
          <CardContent className="h-[180px] p-0 flex justify-center items-center">
            {mounted ? (
              <ResponsiveContainer width="95%" height="90%">
                <BarChart data={sectorData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748B" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={10} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#111C30", borderColor: "#1E293B" }}
                    itemStyle={{ color: "#F8FAFC" }}
                    labelStyle={{ color: "#2563EB", fontWeight: "bold" }}
                  />
                  <Bar dataKey="count" fill="#2563EB" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-foreground/40">Loading Charts...</div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border border-border shadow-glow-blue h-[280px]">
          <CardHeader className="py-4">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-foreground/50">IOC Risk Levels</CardTitle>
            <CardDescription className="text-[10px]">Reputation rating breakdown of indicators</CardDescription>
          </CardHeader>
          <CardContent className="h-[180px] p-0 flex items-center justify-between px-6">
            {mounted ? (
              <>
                <div className="w-[120px] h-[120px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={iocLevelData}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={45}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {iocLevelData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1.5 flex-1 pl-6">
                  {iocLevelData.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-foreground/75">{item.name}</span>
                      </div>
                      <span className="font-bold text-foreground">{item.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-xs text-foreground/40">Loading Charts...</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
