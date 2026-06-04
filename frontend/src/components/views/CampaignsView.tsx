"use client"

import React, { useState, useEffect } from "react"
import { Calendar, Target, Globe, Shield, Flame, Map, Activity, ArrowUpRight } from "lucide-react"
import { mockCampaigns, Campaign, mockIOCs } from "@/data/mockData"
import { intelligenceApi } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function CampaignsView() {
  const [campaigns, setCampaigns] = useState<Campaign[]>(mockCampaigns)
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign>(mockCampaigns[0])

  useEffect(() => {
    async function load() {
      try {
        const list = await intelligenceApi.getCampaigns()
        if (list && list.length > 0) {
          // Convert response schema date/etc to string if needed
          const formattedList = list.map((c: any) => ({
            ...c,
            start_date: c.start_date ? String(c.start_date) : ""
          }))
          setCampaigns(formattedList)
          const firstDetails = await intelligenceApi.getCampaignDetails(list[0].id)
          setSelectedCampaign({
            ...formattedList[0],
            ...firstDetails
          })
        }
      } catch (err) {
        console.error("Failed to load campaigns:", err)
      }
    }
    load()
  }, [])

  const handleCampaignClick = async (camp: any) => {
    setSelectedCampaign(camp)
    try {
      const details = await intelligenceApi.getCampaignDetails(camp.id)
      setSelectedCampaign({
        ...camp,
        ...details
      })
    } catch (e) {
      console.warn("Failed to fetch campaign details:", e)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[640px]">
      {/* Left Column: Campaigns List */}
      <div className="lg:col-span-1 bg-card border border-border rounded-lg p-4 space-y-4 flex flex-col overflow-hidden shadow-glow-blue">
        <div>
          <h3 className="text-sm font-bold text-foreground">Cyber Campaigns</h3>
          <p className="text-[10px] text-foreground/45">Monitored adversary operations</p>
        </div>
        
        <div className="space-y-2 flex-1 overflow-y-auto pr-1">
          {campaigns.map((camp) => {
            const isSelected = selectedCampaign && selectedCampaign.id === camp.id
            return (
              <div
                key={camp.id}
                onClick={() => handleCampaignClick(camp)}
                className={`p-3.5 rounded border transition-all cursor-pointer flex flex-col space-y-1.5 ${
                  isSelected
                    ? "bg-card-hover border-accent-blue shadow-inner"
                    : "bg-[#0B1220]/40 border-border/40 hover:border-border"
                }`}
              >
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-sm text-foreground truncate max-w-[120px]">{camp.name}</h4>
                  <span className={`text-[8.5px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                    camp.status === "Active"
                      ? "bg-accent-rose/10 text-accent-rose border-accent-rose/25"
                      : camp.status === "Completed"
                      ? "bg-accent-emerald/10 text-accent-emerald border-accent-emerald/25"
                      : "bg-foreground/15 text-foreground/45 border-transparent"
                  }`}>
                    {camp.status}
                  </span>
                </div>
                <div className="text-[9.5px] text-foreground/50 space-y-0.5">
                  <p>Actor: <strong className="text-foreground/75 font-semibold">{camp.threat_actor}</strong></p>
                  <p>Started: {camp.start_date}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Right Column: Campaign Tracking Telemetry */}
      <div className="lg:col-span-3 bg-card border border-border rounded-lg p-6 flex flex-col overflow-hidden shadow-glow-blue">
        {/* Campaign Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-border/40 pb-4 mb-4 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-foreground">{selectedCampaign.name}</h2>
              <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${
                selectedCampaign.status === "Active" ? "bg-accent-rose/15 text-accent-rose" : "bg-accent-emerald/15 text-accent-emerald"
              }`}>
                {selectedCampaign.status}
              </span>
            </div>
            <p className="text-xs text-foreground/60 flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
              <span className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-accent-blue" />
                Actor: <strong className="text-foreground/90 font-medium">{selectedCampaign.threat_actor}</strong>
              </span>
              <span className="hidden md:inline h-3 w-px bg-border" />
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-accent-cyan" />
                Start Date: <strong className="text-foreground/90 font-medium">{selectedCampaign.start_date}</strong>
              </span>
              <span className="hidden md:inline h-3 w-px bg-border" />
              <span className="flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-accent-amber" />
                Regions: <strong className="text-foreground/90 font-medium">{selectedCampaign.region.join(", ")}</strong>
              </span>
            </p>
          </div>
        </div>

        {/* Campaign Data Grid */}
        <div className="flex-1 overflow-y-auto space-y-6 pr-1">
          {/* Summary Box */}
          <div className="bg-[#0B1220]/40 p-4 border border-border/40 rounded-lg text-xs leading-relaxed space-y-2">
            <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
              <Flame className="h-4 w-4 text-accent-rose" />
              <span>Tactical Intel Summary</span>
            </h4>
            <p className="text-foreground/85">{selectedCampaign.summary}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Target Sector Heatmap Weights */}
            <div className="border border-border/40 p-4 rounded-lg bg-[#0B1220]/10 space-y-3">
              <h5 className="text-xs font-bold text-foreground/80 uppercase tracking-wider flex items-center gap-1.5">
                <Target className="h-4 w-4 text-accent-blue" />
                <span>Sector Targeting Heatmap</span>
              </h5>
              <div className="space-y-3 pt-1">
                {selectedCampaign.heatmap.map((item, idx) => (
                  <div key={idx} className="space-y-1 text-xs">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-foreground/80 font-medium">{item.sector}</span>
                      <span className="font-bold text-foreground/60">{item.weight}% weight</span>
                    </div>
                    <div className="w-full bg-[#0B1220] h-2 rounded overflow-hidden border border-border/40">
                      <div
                        className="bg-accent-blue h-full rounded transition-all duration-500"
                        style={{ width: `${item.weight}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Campaign Timeline */}
            <div className="border border-border/40 p-4 rounded-lg bg-[#0B1220]/10 space-y-3">
              <h5 className="text-xs font-bold text-foreground/80 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-accent-cyan" />
                <span>Campaign Milestones</span>
              </h5>
              <div className="relative border-l-2 border-border pl-4 space-y-4 py-1 text-xs max-h-[220px] overflow-y-auto">
                {selectedCampaign.timeline.map((event, idx) => (
                  <div key={idx} className="relative">
                    <span className="absolute -left-[21px] top-0.5 bg-accent-blue h-2.5 w-2.5 rounded-full border-2 border-card" />
                    <div className="text-[10px] text-foreground/40 font-semibold mb-0.5">{event.date}</div>
                    <p className="text-foreground/85 leading-normal">{event.event}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Associated IOCs */}
          <div className="border border-border/40 p-4 rounded-lg bg-[#0B1220]/10 space-y-3">
            <h5 className="text-xs font-bold text-foreground/80 uppercase tracking-wider flex items-center gap-1.5">
              <Map className="h-4 w-4 text-accent-amber" />
              <span>Associated Indicators ({selectedCampaign.iocs.length})</span>
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {selectedCampaign.iocs.map((iocVal, idx) => {
                const iocObj = mockIOCs.find(i => i.value === iocVal)
                return (
                  <div key={idx} className="bg-card border border-border/40 p-2.5 rounded flex flex-col justify-between space-y-1">
                    <span className="font-mono text-accent-cyan text-[11px] truncate select-all">{iocVal}</span>
                    <div className="flex justify-between items-center text-[9px] text-foreground/50 border-t border-border/20 pt-1 mt-1">
                      <span>{iocObj?.type || "Domain"}</span>
                      <span className={`font-bold ${
                        (iocObj?.risk_score || 50) >= 90 ? "text-accent-rose" :
                        (iocObj?.risk_score || 50) >= 75 ? "text-accent-amber" : "text-accent-emerald"
                      }`}>
                        Score: {iocObj?.risk_score || 50}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
