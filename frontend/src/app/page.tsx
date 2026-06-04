"use client"

import React, { useState, useEffect } from "react"
import { Shield, Users, Database, Network, Flame, Grid, Cpu, Briefcase, Eye, Terminal, Clock, LogOut, Lock, Key } from "lucide-react"
import { authApi } from "@/lib/api"

// Import views
import DashboardView from "@/components/views/DashboardView"
import ActorsView from "@/components/views/ActorsView"
import IocsView from "@/components/views/IocsView"
import CorrelationGraph from "@/components/graph/CorrelationGraph"
import CampaignsView from "@/components/views/CampaignsView"
import MitreView from "@/components/views/MitreView"
import MalwareView from "@/components/views/MalwareView"
import WorkspaceView from "@/components/views/WorkspaceView"

type ActiveView = "dashboard" | "actors" | "iocs" | "graph" | "campaigns" | "mitre" | "malware" | "workspace"

export default function Home() {
  const [user, setUser] = useState<{ username: string; role: string } | null>(null)
  const [selectedView, setSelectedView] = useState<ActiveView>("dashboard")
  const [currentTime, setCurrentTime] = useState("")
  
  // Login form state
  const [usernameInput, setUsernameInput] = useState("")
  const [passwordInput, setPasswordInput] = useState("")
  const [loginError, setLoginError] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Check if user is logged in
    const currentUser = authApi.getCurrentUser()
    if (currentUser && currentUser.username && currentUser.role) {
      setUser({ username: currentUser.username, role: currentUser.role })
    }

    // Dynamic time updater for top-bar intelligence clock
    const updateTime = () => {
      const date = new Date()
      setCurrentTime(date.toLocaleTimeString("en-US", { hour12: false }))
    }
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError("")
    setLoading(true)
    try {
      const loggedUser = await authApi.login(usernameInput, passwordInput)
      setUser(loggedUser)
    } catch (err: any) {
      setLoginError(err.message || "Failed to authenticate.")
    } finally {
      setLoading(false)
    }
  }

  const handleQuickLogin = async (roleName: string) => {
    setLoginError("")
    setLoading(true)
    try {
      const loggedUser = await authApi.login(roleName, "secure_password123")
      setUser(loggedUser)
    } catch (err: any) {
      setLoginError("Quick login failed.")
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    authApi.logout()
    setUser(null)
  }

  // Side bar navigation links
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: Shield },
    { id: "actors", label: "Threat Actors", icon: Users },
    { id: "iocs", label: "IOC Database", icon: Database },
    { id: "graph", label: "Correlation Graph", icon: Network },
    { id: "campaigns", label: "Campaign Tracking", icon: Flame },
    { id: "mitre", label: "MITRE ATT&CK", icon: Grid },
    { id: "malware", label: "Malware Intel", icon: Cpu },
    { id: "workspace", label: "Workspace Folder", icon: Briefcase }
  ]

  const getViewTitle = () => {
    switch (selectedView) {
      case "dashboard": return "Security Intelligence Dashboard"
      case "actors": return "Threat Actor Intelligence Profiles"
      case "iocs": return "Forensic Indicators (IOC) Registry"
      case "graph": return "Intelligence Correlation Graph"
      case "campaigns": return "Operations & Campaign Tracking"
      case "mitre": return "MITRE ATT&CK Matrix Mapping"
      case "malware": return "Malware Families Database"
      case "workspace": return "Investigation Dossier Workspace"
    }
  }

  // Render Login Page if not authenticated
  if (!user) {
    return (
      <div className="flex h-screen bg-[#020617] text-slate-100 flex-col items-center justify-center font-sans p-6 overflow-y-auto">
        <div className="w-full max-w-md bg-[#0b1329] border border-slate-800 rounded-xl p-8 shadow-glow-blue space-y-6">
          
          <div className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-center justify-center text-blue-400">
              <Shield className="h-6 w-6 animate-pulse" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">ThreatLens V2</h1>
            <p className="text-xs text-slate-400">Authorized Investigator Login Portal</p>
          </div>

          {loginError && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3 rounded text-xs text-center font-semibold">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Username</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  required
                  placeholder="Enter badge username..."
                  className="w-full bg-slate-900 border border-slate-700 pl-10 pr-4 py-2 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Passphrase</label>
              <div className="relative">
                <Key className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  className="w-full bg-slate-900 border border-slate-700 pl-10 pr-4 py-2 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-bold rounded-lg text-sm cursor-pointer shadow-md transition-colors"
            >
              {loading ? "Verifying Credentials..." : "Authenticate"}
            </button>
          </form>

          {/* Quick login for reviewer */}
          <div className="border-t border-slate-800/80 pt-5 space-y-3">
            <div className="text-center text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              Quick-Auth Portals
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleQuickLogin("admin")}
                className="py-1.5 px-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-[10px] font-bold text-blue-400 hover:text-blue-300 transition-all cursor-pointer text-center"
              >
                Admin
              </button>
              <button
                onClick={() => handleQuickLogin("investigator")}
                className="py-1.5 px-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-[10px] font-bold text-emerald-400 hover:text-emerald-300 transition-all cursor-pointer text-center"
              >
                Investigator
              </button>
              <button
                onClick={() => handleQuickLogin("analyst")}
                className="py-1.5 px-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-[10px] font-bold text-amber-400 hover:text-amber-300 transition-all cursor-pointer text-center"
              >
                Analyst
              </button>
            </div>
          </div>

        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden text-foreground">
      
      {/* 1. Left Sidebar Navigation */}
      <aside className="w-64 bg-card border-r border-border flex flex-col justify-between select-none">
        
        {/* Top Header */}
        <div className="p-5 border-b border-border/40 space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-accent-blue/15 rounded text-accent-blue border border-accent-blue/20">
              <Network className="h-5 w-5" />
            </div>
            <h1 className="font-extrabold text-lg tracking-tight text-white">ThreatLens</h1>
          </div>
          <p className="text-[10px] text-foreground/45 uppercase tracking-wider font-semibold">Investigations Hub</p>
        </div>

        {/* Middle Navigation Links */}
        <nav className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = selectedView === item.id
            return (
              <button
                key={item.id}
                onClick={() => setSelectedView(item.id as ActiveView)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                  isActive
                    ? "bg-accent-blue text-white shadow-glow-blue font-bold"
                    : "text-foreground/65 hover:bg-card-hover hover:text-foreground/95"
                }`}
              >
                <Icon className="h-4.5 w-4.5" />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        {/* Bottom Investigator Section */}
        <div className="p-4 border-t border-border/40 bg-[#080E1A]/40 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 truncate">
              <div className="w-8 h-8 rounded-full bg-card-hover border border-border flex items-center justify-center text-xs font-bold text-accent-blue">
                {user.username.slice(0, 2).toUpperCase()}
              </div>
              <div className="truncate text-xs">
                <h5 className="font-bold text-foreground leading-none capitalize">{user.username}</h5>
                <span className="text-[9px] text-foreground/40 font-mono mt-0.5 block uppercase">{user.role}</span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 bg-slate-900/60 hover:bg-rose-500/10 hover:text-rose-400 border border-border/40 rounded transition-colors cursor-pointer"
              title="Log Out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="border-t border-border/20 pt-2 text-[9px] text-foreground/35 uppercase text-center font-bold tracking-wider">
            LE SENSITIVE // FOUO
          </div>
        </div>
      </aside>

      {/* 2. Main View Container */}
      <main className="flex-1 flex flex-col overflow-hidden bg-[#080E1A]/35">
        
        {/* Global Topbar */}
        <header className="h-14 bg-card/60 border-b border-border px-6 flex items-center justify-between shadow-sm select-none">
          <h2 className="text-xs font-extrabold text-foreground/90 uppercase tracking-widest flex items-center gap-2">
            <Terminal className="h-4 w-4 text-accent-blue" />
            <span>{getViewTitle()}</span>
          </h2>

          <div className="flex items-center gap-4 text-[10px] text-foreground/50">
            {/* Systems telemetry badge */}
            <div className="flex items-center gap-1.5 bg-[#0B1220] px-2.5 py-1 border border-border rounded">
              <span className="h-2 w-2 rounded-full bg-accent-emerald animate-pulse" />
              <span className="font-semibold text-foreground/80 tracking-wider">SYSTEMS CONNECTED</span>
            </div>
            
            {/* Classification Level badge */}
            <div className="bg-accent-rose/10 border border-accent-rose/25 text-accent-rose font-extrabold px-2.5 py-1 rounded tracking-widest uppercase">
              LE Sensitive
            </div>

            {/* Time Clock */}
            <div className="flex items-center gap-1 bg-[#0B1220] px-2.5 py-1 border border-border rounded font-mono text-foreground/80">
              <Clock className="h-3 w-3 text-accent-cyan" />
              <span>{currentTime || "00:00:00"}</span>
            </div>
          </div>
        </header>

        {/* Center Content Panel */}
        <div className="flex-1 overflow-y-auto p-6">
          {selectedView === "dashboard" && <DashboardView />}
          {selectedView === "actors" && <ActorsView />}
          {selectedView === "iocs" && <IocsView />}
          {selectedView === "graph" && <CorrelationGraph />}
          {selectedView === "campaigns" && <CampaignsView />}
          {selectedView === "mitre" && <MitreView />}
          {selectedView === "malware" && <MalwareView />}
          {selectedView === "workspace" && <WorkspaceView />}
        </div>
      </main>

    </div>
  )
}
