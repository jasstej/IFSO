"use client"

import React, { useState, useEffect } from "react"
import { Grid, Tag, Shield, AlertCircle, Info, Crosshair } from "lucide-react"
import { mockMitreMatrix, MitreTechnique } from "@/data/mockData"
import { intelligenceApi } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function MitreView() {
  const [selectedCampaign, setSelectedCampaign] = useState<string>("All")
  const [matrix, setMatrix] = useState<MitreTechnique[]>(mockMitreMatrix)
  const [selectedTech, setSelectedTech] = useState<MitreTechnique | null>(mockMitreMatrix[0])

  useEffect(() => {
    async function load() {
      try {
        const data = await intelligenceApi.getMitreMatrix()
        setMatrix(data)
        if (data.length > 0) {
          setSelectedTech(data[0])
        }
      } catch (err) {
        console.error("Failed to load MITRE matrix:", err)
      }
    }
    load()
  }, [])

  // Tactics columns list
  const tactics = [
    "Initial Access",
    "Execution",
    "Defense Evasion",
    "Credential Access",
    "Collection",
    "Exfiltration"
  ]

  // Filter techniques based on active campaign filter
  const getTechniquesForTactic = (tactic: string) => {
    return matrix.filter(tech => {
      const matchesTactic = tech.tactic === tactic
      const matchesCampaign = selectedCampaign === "All" || tech.campaigns.includes(selectedCampaign)
      return matchesTactic && matchesCampaign
    })
  }

  return (
    <div className="space-y-6">
      {/* 1. Header and Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-card border border-border p-4 rounded-lg gap-4 shadow-glow-blue">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
            <Grid className="h-4 w-4 text-accent-blue" />
            <span>MITRE ATT&CK Mapping Matrix</span>
          </h3>
          <p className="text-[10px] text-foreground/45">Visualizing tactical techniques exploited across campaigns</p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-foreground/60">Filter by Campaign:</span>
          <select
            className="bg-background border border-border/80 rounded px-2 py-1 focus:outline-none text-foreground"
            value={selectedCampaign}
            onChange={e => setSelectedCampaign(e.target.value)}
          >
            <option value="All">All Campaigns</option>
            <option value="Operation GhostShell">Operation GhostShell (APT28)</option>
            <option value="Operation GoldDragon">Operation GoldDragon (Lazarus)</option>
            <option value="Operation Carbanak">Operation Carbanak (FIN7)</option>
          </select>
        </div>
      </div>

      {/* 2. ATT&CK Matrix Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3 overflow-x-auto min-w-[960px] pb-2">
        {tactics.map((tactic, idx) => {
          const techs = getTechniquesForTactic(tactic)
          return (
            <div key={idx} className="flex flex-col space-y-2 bg-card/60 border border-border/40 rounded p-2.5 min-h-[300px]">
              {/* Tactic Column Header */}
              <div className="border-b border-border/80 pb-2 mb-1">
                <h4 className="text-[10px] font-extrabold uppercase text-accent-blue tracking-wider truncate" title={tactic}>
                  {tactic}
                </h4>
                <span className="text-[9px] text-foreground/40 font-semibold">({techs.length} Techniques)</span>
              </div>
              
              {/* Techniques cards */}
              <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[320px] pr-1">
                {techs.map((tech) => {
                  const isSelected = selectedTech?.technique_id === tech.technique_id
                  return (
                    <div
                      key={tech.technique_id}
                      onClick={() => setSelectedTech(tech)}
                      className={`p-2.5 rounded border transition-all cursor-pointer space-y-1 ${
                        isSelected
                          ? "bg-card border-accent-blue shadow-glow-blue"
                          : "bg-[#0B1220]/40 border-border/30 hover:border-border/60"
                      }`}
                    >
                      <div className="flex justify-between items-center text-[9px] font-mono text-foreground/40">
                        <span className="font-bold text-accent-cyan/90">{tech.technique_id}</span>
                      </div>
                      <h5 className="text-[10px] font-bold text-foreground/85 leading-snug line-clamp-2">
                        {tech.name}
                      </h5>
                      <div className="flex flex-wrap gap-0.5 pt-1">
                        {tech.campaigns.map((c, i) => (
                          <span key={i} className="text-[7.5px] bg-accent-blue/10 text-accent-blue px-1 rounded uppercase font-semibold">
                            {c.replace("Operation ", "Op ")}
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                })}
                {techs.length === 0 && (
                  <div className="text-[9px] text-center text-foreground/30 py-6 italic">
                    No active techniques
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* 3. Technique Inspector Details */}
      {selectedTech && (
        <Card className="bg-card border border-border p-5 shadow-glow-blue">
          <div className="flex flex-col md:flex-row justify-between items-start border-b border-border/40 pb-3 mb-3 gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold text-accent-amber border border-accent-amber/25 bg-accent-amber/10 px-2 py-0.5 rounded">
                  {selectedTech.tactic}
                </span>
                <span className="text-xs font-mono text-accent-cyan font-bold">{selectedTech.technique_id}</span>
              </div>
              <h4 className="text-base font-bold text-foreground mt-1">
                {selectedTech.name}
              </h4>
            </div>

            <div className="text-xs text-foreground/50 flex items-center gap-1 bg-[#0B1220] px-3 py-1.5 border border-border rounded">
              <Crosshair className="h-3.5 w-3.5 text-accent-blue" />
              <span>Exploited in Campaigns: <strong>{selectedTech.campaigns.join(", ")}</strong></span>
            </div>
          </div>

          <div className="text-xs space-y-2 text-foreground/80 leading-relaxed max-w-4xl">
            <h5 className="font-semibold text-foreground flex items-center gap-1.5">
              <Info className="h-4 w-4 text-accent-blue" />
              <span>Tactical Technique Analysis</span>
            </h5>
            <p>
              This adversarial technique involves executing commands, launching malicious payloads, or disabling defenses. In monitored investigations, this has been mapped to spearphishing attachments containing modular loader files, disabling system endpoint firewalls, or dumping system hashes from LSASS memory space.
            </p>
            <p className="text-[11px] text-foreground/45 border-t border-border/20 pt-2 italic">
              Mitre ATT&CK ID Reference framework: {selectedTech.technique_id} - standard cybersecurity schema for defensive verification.
            </p>
          </div>
        </Card>
      )}
    </div>
  )
}
