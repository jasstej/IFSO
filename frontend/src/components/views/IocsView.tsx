"use client"

import React, { useState, useEffect } from "react"
import { Search, Database, Plus, Trash2, Tag, Shield, AlertTriangle, ArrowRight } from "lucide-react"
import { mockIOCs, IOC } from "@/data/mockData"
import { iocsApi } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function IocsView() {
  const [iocs, setIocs] = useState<IOC[]>(mockIOCs)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState<string>("All")
  
  // Form state for creating new IOC
  const [newValue, setNewValue] = useState("")
  const [newType, setNewType] = useState<IOC["type"]>("IP Address")
  const [newScore, setNewScore] = useState<number>(50)
  const [newDescription, setNewDescription] = useState("")
  const [newTags, setNewTags] = useState("")

  useEffect(() => {
    async function load() {
      try {
        const list = await iocsApi.getIocs()
        setIocs(list)
      } catch (err) {
        console.error("Failed to load IOCs:", err)
      }
    }
    load()
  }, [])

  // Tag editing state for existing IOCs
  const [activeIocId, setActiveIocId] = useState<string | null>(null)
  const [newTagInput, setNewTagInput] = useState("")

  // Add tag handler
  const handleAddTag = (iocId: string) => {
    if (!newTagInput.trim()) return
    setIocs(prev =>
      prev.map(ioc =>
        ioc.id === iocId
          ? { ...ioc, tags: [...ioc.tags, newTagInput.trim()] }
          : ioc
      )
    )
    setNewTagInput("")
  }

  // Adjust risk score handler
  const handleScoreChange = (iocId: string, score: number) => {
    let threatLevel: IOC["threat_level"] = "Medium"
    if (score >= 90) threatLevel = "Critical"
    else if (score >= 75) threatLevel = "High"
    else if (score >= 40) threatLevel = "Medium"
    else threatLevel = "Low"

    setIocs(prev =>
      prev.map(ioc =>
        ioc.id === iocId
          ? { ...ioc, risk_score: score, threat_level: threatLevel }
          : ioc
      )
    )
  }

  // Create new IOC handler
  const handleCreateIOC = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newValue.trim()) return

    let threatLevel: IOC["threat_level"] = "Medium"
    if (newScore >= 90) threatLevel = "Critical"
    else if (newScore >= 75) threatLevel = "High"
    else if (newScore >= 40) threatLevel = "Medium"
    else threatLevel = "Low"

    const entityData = {
      value: newValue.trim(),
      type: newType,
      risk_score: newScore,
      threat_level: threatLevel,
      description: newDescription.trim() || "User cataloged forensic indicator.",
      tags: newTags ? newTags.split(",").map(t => t.trim()) : ["Manual"]
    }

    try {
      const created = await iocsApi.createIoc(entityData)
      setIocs(prev => [created, ...prev])
      setNewValue("")
      setNewDescription("")
      setNewTags("")
      setNewScore(50)
    } catch (err) {
      console.error("Failed to create IOC:", err)
    }
  }

  // Delete IOC handler
  const handleDeleteIOC = (iocId: string) => {
    setIocs(prev => prev.filter(ioc => ioc.id !== iocId))
  }

  // Filter and search logic
  const filteredIOCs = iocs.filter(ioc => {
    const matchesSearch =
      ioc.value.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ioc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ioc.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
      
    const matchesType = filterType === "All" || ioc.type === filterType
    return matchesSearch && matchesType
  })

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
      {/* Left Columns: Search & Table */}
      <div className="xl:col-span-3 bg-card border border-border rounded-lg p-5 flex flex-col space-y-4 shadow-glow-blue">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <h3 className="text-sm font-bold text-foreground">Indicator Intelligence Database</h3>
            <p className="text-[10px] text-foreground/45">Indicators of Compromise (IOC) registry</p>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            {/* Search */}
            <div className="relative flex-1 md:w-60">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-foreground/40" />
              <input
                type="text"
                placeholder="Search values, tags, notes..."
                className="pl-8 pr-4 py-1.5 w-full text-xs bg-background border border-border/80 rounded focus:outline-none focus:ring-1 focus:ring-accent-blue"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            {/* Filter */}
            <select
              className="bg-background border border-border/80 rounded px-2 py-1.5 text-xs text-foreground focus:outline-none"
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
            >
              <option value="All">All Types</option>
              <option value="Domain">Domains</option>
              <option value="IP Address">IP Addresses</option>
              <option value="SHA256 Hash">Hashes</option>
              <option value="Cryptocurrency Wallet">Crypto Wallets</option>
              <option value="Email Address">Email Addresses</option>
            </select>
          </div>
        </div>

        {/* IOC Table */}
        <div className="border border-border/60 rounded-lg overflow-hidden flex-1 max-h-[480px] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-card-hover border-b border-border text-foreground/60 font-semibold uppercase text-[10px]">
                <th className="p-3 w-[25%]">Indicator Value</th>
                <th className="p-3 w-[15%]">Type</th>
                <th className="p-3 w-[20%]">Risk Telemetry</th>
                <th className="p-3 w-[25%]">Tags & Description</th>
                <th className="p-3 w-[15%] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {filteredIOCs.map((ioc) => (
                <tr key={ioc.id} className="hover:bg-[#0B1220]/20">
                  {/* Value */}
                  <td className="p-3 font-mono text-accent-cyan select-all break-all pr-4">
                    {ioc.value}
                  </td>
                  {/* Type */}
                  <td className="p-3 font-medium text-foreground/80">{ioc.type}</td>
                  {/* Risk Telemetry */}
                  <td className="p-3 space-y-2.5">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className={`font-semibold uppercase ${
                        ioc.threat_level === "Critical" ? "text-accent-rose" :
                        ioc.threat_level === "High" ? "text-accent-amber" : "text-accent-emerald"
                      }`}>
                        {ioc.threat_level} ({ioc.risk_score})
                      </span>
                      <span className="text-foreground/40">{ioc.reputation}</span>
                    </div>
                    {/* Interactive slider to adjust risk score */}
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={ioc.risk_score}
                      onChange={e => handleScoreChange(ioc.id, parseInt(e.target.value))}
                      className="w-full accent-accent-blue h-1 bg-[#0B1220] rounded-lg cursor-pointer"
                    />
                  </td>
                  {/* Tags & Desc */}
                  <td className="p-3 space-y-1.5 max-w-[240px]">
                    <p className="text-[10px] text-foreground/65 leading-tight italic">{ioc.description}</p>
                    
                    <div className="flex flex-wrap gap-1 items-center">
                      {ioc.tags.map((tag, i) => (
                        <span key={i} className="inline-flex items-center gap-0.5 bg-card-hover text-foreground/75 px-1.5 py-0.5 rounded text-[9px] border border-border/40">
                          <Tag className="h-2 w-2 text-accent-blue" />
                          <span>{tag}</span>
                        </span>
                      ))}
                      
                      {activeIocId === ioc.id ? (
                        <div className="flex items-center gap-1 mt-1">
                          <input
                            type="text"
                            placeholder="tag..."
                            className="bg-background border border-border/80 text-[9px] px-1 rounded w-14 focus:outline-none"
                            value={newTagInput}
                            onChange={e => setNewTagInput(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && handleAddTag(ioc.id)}
                            autoFocus
                          />
                          <button
                            onClick={() => handleAddTag(ioc.id)}
                            className="text-[9px] text-accent-blue font-bold px-1 hover:underline cursor-pointer"
                          >
                            Add
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setActiveIocId(ioc.id)
                            setNewTagInput("")
                          }}
                          className="text-[9px] text-accent-blue/80 hover:text-accent-blue flex items-center gap-0.5 hover:underline mt-0.5 cursor-pointer"
                        >
                          <Plus className="h-2.5 w-2.5" />
                          <span>Add Tag</span>
                        </button>
                      )}
                    </div>
                  </td>
                  {/* Actions */}
                  <td className="p-3 text-right">
                    <button
                      onClick={() => handleDeleteIOC(ioc.id)}
                      className="text-foreground/40 hover:text-accent-rose transition-colors cursor-pointer"
                      title="Delete Indicator"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredIOCs.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-foreground/45 text-xs">
                    No Indicators matching search filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right Column: Collect/Store Form */}
      <div className="xl:col-span-1 bg-card border border-border rounded-lg p-5 flex flex-col space-y-4 shadow-glow-blue">
        <div>
          <h3 className="text-sm font-bold text-foreground">Collect Forensic Indicator</h3>
          <p className="text-[10px] text-foreground/45">Ingest new IOC registry telemetry</p>
        </div>

        <form onSubmit={handleCreateIOC} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="text-foreground/60 font-semibold uppercase text-[9px]">Indicator Type</label>
            <select
              className="w-full bg-background border border-border/80 rounded p-2 text-foreground focus:outline-none"
              value={newType}
              onChange={e => setNewType(e.target.value as IOC["type"])}
            >
              <option value="IP Address">IP Address</option>
              <option value="Domain">Domain Name</option>
              <option value="SHA256 Hash">SHA256 Hash</option>
              <option value="Cryptocurrency Wallet">Cryptocurrency Wallet</option>
              <option value="Email Address">Email Address</option>
              <option value="URL">URL Link</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-foreground/60 font-semibold uppercase text-[9px]">Indicator Value</label>
            <input
              type="text"
              placeholder="e.g. 192.168.1.1 or malicious-dns.com"
              required
              className="w-full bg-background border border-border/80 rounded p-2 text-foreground focus:outline-none focus:border-accent-blue"
              value={newValue}
              onChange={e => setNewValue(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-foreground/60 font-semibold uppercase text-[9px]">Initial Risk Score ({newScore})</label>
              <span className={`text-[10px] font-bold ${
                newScore >= 90 ? "text-accent-rose" :
                newScore >= 75 ? "text-accent-amber" : "text-accent-emerald"
              }`}>
                {newScore >= 90 ? "Critical" : newScore >= 75 ? "High" : newScore >= 40 ? "Medium" : "Low"}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={newScore}
              onChange={e => setNewScore(parseInt(e.target.value))}
              className="w-full accent-accent-blue h-1 bg-[#0B1220] rounded-lg cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <label className="text-foreground/60 font-semibold uppercase text-[9px]">Description / Forensic Notes</label>
            <textarea
              placeholder="Provide evidence sources or context..."
              className="w-full bg-background border border-border/80 rounded p-2 text-foreground focus:outline-none h-16 resize-none"
              value={newDescription}
              onChange={e => setNewDescription(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-foreground/60 font-semibold uppercase text-[9px]">Intelligence Tags (comma separated)</label>
            <input
              type="text"
              placeholder="e.g. C2, Lazarus, POS"
              className="w-full bg-background border border-border/80 rounded p-2 text-foreground focus:outline-none"
              value={newTags}
              onChange={e => setNewTags(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="w-full py-2 bg-accent-blue hover:bg-accent-blue/90 font-bold text-white rounded cursor-pointer transition-colors"
          >
            Store In Database
          </button>
        </form>
      </div>
    </div>
  )
}
