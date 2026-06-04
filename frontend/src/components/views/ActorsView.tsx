"use client"

import React, { useState, useEffect } from "react"
import { Shield, MapPin, Target, Eye, Database, Cpu, Calendar, AlertTriangle } from "lucide-react"
import { mockActors, ThreatActor } from "@/data/mockData"
import { intelligenceApi } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function ActorsView() {
  const [actors, setActors] = useState<any[]>(mockActors)
  const [selectedActor, setSelectedActor] = useState<any>(mockActors[0])

  useEffect(() => {
    async function load() {
      try {
        const list = await intelligenceApi.getActors()
        if (list && list.length > 0) {
          setActors(list)
          const firstDetails = await intelligenceApi.getActorDetails(list[0].id)
          setSelectedActor({
            ...list[0],
            ...firstDetails,
            description: firstDetails.summary || firstDetails.description || list[0].description
          })
        }
      } catch (err) {
        console.error("Failed to load actors:", err)
      }
    }
    load()
  }, [])

  const handleActorClick = async (actor: any) => {
    setSelectedActor(actor)
    try {
      const details = await intelligenceApi.getActorDetails(actor.id)
      setSelectedActor({
        ...actor,
        ...details,
        description: details.summary || details.description || actor.description
      })
    } catch (e) {
      console.warn("Failed to fetch actor details:", e)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[640px]">
      {/* Left Column: Actor Selector List */}
      <div className="lg:col-span-1 bg-card border border-border rounded-lg p-4 space-y-4 flex flex-col overflow-hidden shadow-glow-blue">
        <div>
          <h3 className="text-sm font-bold text-foreground">Threat Actors</h3>
          <p className="text-[10px] text-foreground/45">Cataloged cyber warfare groups</p>
        </div>
        
        <div className="space-y-2 flex-1 overflow-y-auto pr-1">
          {actors.map((actor) => {
            const isSelected = selectedActor && selectedActor.id === actor.id
            return (
              <div
                key={actor.id}
                onClick={() => handleActorClick(actor)}
                className={`p-3.5 rounded border transition-all cursor-pointer flex flex-col space-y-1 ${
                  isSelected
                    ? "bg-card-hover border-accent-blue shadow-inner"
                    : "bg-[#0B1220]/40 border-border/40 hover:border-border"
                }`}
              >
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-sm text-foreground">{actor.name}</h4>
                  <span className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                    actor.threat_level === "Critical" ? "bg-accent-rose/10 text-accent-rose" : "bg-accent-amber/10 text-accent-amber"
                  }`}>
                    {actor.threat_level}
                  </span>
                </div>
                <div className="text-[10px] text-foreground/50 flex justify-between">
                  <span>Origin: {actor.country || "Unknown"}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Right Column: Detailed Profile with Tabs */}
      <div className="lg:col-span-3 bg-card border border-border rounded-lg p-6 flex flex-col overflow-hidden shadow-glow-blue">
        {/* Profile Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-border/40 pb-4 mb-4 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-foreground">{selectedActor.name}</h2>
              <span className="text-xs text-foreground/40 font-mono">({selectedActor.aliases.join(", ")})</span>
            </div>
            <p className="text-xs text-foreground/60 flex items-center gap-2 mt-1">
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-accent-blue" />
                Origin: <strong className="text-foreground/90 font-medium">{selectedActor.country}</strong>
              </span>
              <span className="h-3 w-px bg-border mx-1" />
              <span className="flex items-center gap-1">
                <Target className="h-3.5 w-3.5 text-accent-cyan" />
                Motivation: <strong className="text-foreground/90 font-medium">{selectedActor.motivation}</strong>
              </span>
            </p>
          </div>
          
          <div className="flex items-center gap-2 bg-[#0B1220] px-4 py-2 border border-border rounded-md">
            <span className="text-xs text-foreground/45 font-semibold uppercase tracking-wider">Overall Threat Index:</span>
            <span className="text-sm font-bold text-accent-rose">{selectedActor.threat_level}</span>
          </div>
        </div>

        {/* Profile Tabs */}
        <Tabs defaultValue="summary" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="w-full md:w-auto justify-start">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="infrastructure">Infrastructure</TabsTrigger>
            <TabsTrigger value="malware">Malware</TabsTrigger>
            <TabsTrigger value="attack">MITRE ATT&CK</TabsTrigger>
            <TabsTrigger value="timeline">Campaign Timeline</TabsTrigger>
          </TabsList>

          {/* 1. Summary Tab */}
          <TabsContent value="summary" className="flex-1 overflow-y-auto space-y-4 pr-1">
            <div className="bg-[#0B1220]/40 p-4 border border-border/40 rounded-lg text-xs leading-relaxed space-y-2">
              <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                <Eye className="h-4 w-4 text-accent-blue" />
                <span>Intelligence Profile Assessment</span>
              </h4>
              <p className="text-foreground/80">{selectedActor.description}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="border border-border/40 p-4 rounded-lg bg-[#0B1220]/20 space-y-2">
                <h5 className="font-bold text-foreground/90 uppercase tracking-wider">Aliases & Codes</h5>
                <ul className="list-disc list-inside space-y-1 text-foreground/75">
                  {selectedActor.aliases.map((alias: string, i: number) => (
                    <li key={i}>{alias}</li>
                  ))}
                </ul>
              </div>
              <div className="border border-border/40 p-4 rounded-lg bg-[#0B1220]/20 space-y-2">
                <h5 className="font-bold text-foreground/90 uppercase tracking-wider">Tactical Motivations</h5>
                <p className="text-foreground/75 leading-normal">{selectedActor.motivation} - targeting government logs, international defense treaties, and national critical infrastructure assets.</p>
              </div>
            </div>
          </TabsContent>

          {/* 2. Infrastructure Tab */}
          <TabsContent value="infrastructure" className="flex-1 overflow-y-auto pr-1">
            <div className="border border-border/60 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-card-hover border-b border-border text-foreground/60 font-semibold uppercase text-[10px]">
                    <th className="p-3">Asset Type</th>
                    <th className="p-3">Indicator Value</th>
                    <th className="p-3">IP Resolution</th>
                    <th className="p-3">Threat Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {selectedActor.infrastructure.map((infra: any, idx: number) => (
                    <tr key={idx} className="hover:bg-[#0B1220]/20">
                      <td className="p-3 font-semibold text-foreground/85 flex items-center gap-1.5">
                        <Database className="h-3.5 w-3.5 text-accent-blue" />
                        {infra.type}
                      </td>
                      <td className="p-3 font-mono text-accent-cyan/95 select-all">{infra.value}</td>
                      <td className="p-3 font-mono text-foreground/60">{infra.ip_resolved || "N/A"}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 text-[9px] font-bold rounded uppercase ${
                          infra.status.includes("Active") ? "bg-accent-rose/10 text-accent-rose border border-accent-rose/20" : "bg-foreground/10 text-foreground/45"
                        }`}>
                          {infra.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* 3. Malware Tab */}
          <TabsContent value="malware" className="flex-1 overflow-y-auto pr-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedActor.malware.map((mal: any, idx: number) => (
                <div key={idx} className="border border-border/40 rounded-lg p-4 bg-[#0B1220]/30 space-y-2 flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-sm text-foreground">{mal.name}</h4>
                      <span className="text-[10px] bg-accent-blue/10 text-accent-blue px-2 py-0.5 rounded font-medium">
                        {mal.type}
                      </span>
                    </div>
                    <p className="text-[11px] text-foreground/50">First Observed in Campaigns: {mal.first_seen}</p>
                  </div>
                  <div className="flex justify-between items-center border-t border-border/30 pt-2 text-[10px]">
                    <span className="text-foreground/45">Risk Assessment:</span>
                    <span className="font-bold text-accent-rose uppercase">{mal.risk}</span>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* 4. MITRE ATT&CK Tab */}
          <TabsContent value="attack" className="flex-1 overflow-y-auto pr-1">
            <div className="border border-border/60 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-card-hover border-b border-border text-foreground/60 font-semibold uppercase text-[10px]">
                    <th className="p-3">Tactic</th>
                    <th className="p-3">Technique ID</th>
                    <th className="p-3">Technique Name</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {selectedActor.attack.map((att: any, idx: number) => (
                    <tr key={idx} className="hover:bg-[#0B1220]/20">
                      <td className="p-3 font-semibold text-accent-amber flex items-center gap-1.5">
                        <Cpu className="h-3.5 w-3.5" />
                        {att.tactic}
                      </td>
                      <td className="p-3 font-mono font-bold text-foreground/80">{att.technique_id}</td>
                      <td className="p-3 text-foreground/75">{att.technique}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* 5. Timeline Tab */}
          <TabsContent value="timeline" className="flex-1 overflow-y-auto pr-1">
            <div className="relative border-l-2 border-border pl-4 space-y-4 py-2 text-xs">
              {selectedActor.timeline.map((time: any, idx: number) => (
                <div key={idx} className="relative">
                  <span className="absolute -left-[21px] top-0.5 bg-accent-blue h-2.5 w-2.5 rounded-full border-2 border-card" />
                  <div className="flex items-center gap-2 text-[10px] text-foreground/40 font-semibold mb-0.5">
                    <Calendar className="h-3 w-3" />
                    <span>{time.date}</span>
                  </div>
                  <h4 className="font-bold text-foreground/90">{time.event}</h4>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
