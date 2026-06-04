"use client"

import React, { useState, useEffect, useRef } from "react"
import { Briefcase, User, Plus, Edit3, Save, FileText, CheckSquare, Square, Tag, Trash2, ArrowRight, CheckCircle2, Upload, Download, History, ShieldAlert, FileJson, FileSpreadsheet } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { 
  casesApi, evidenceApi, notesApi, entitiesApi, importApi, downloadPdfReport 
} from "@/lib/api"
import { mockActors, mockCampaigns, mockIOCs } from "@/data/mockData"

export default function WorkspaceView() {
  const [cases, setCases] = useState<any[]>([])
  const [selectedCase, setSelectedCase] = useState<any>(null)
  const [timeline, setTimeline] = useState<any[]>([])
  const [evidence, setEvidence] = useState<any[]>([])
  const [notes, setNotes] = useState<any[]>([])
  const [allEntities, setAllEntities] = useState<any[]>([])
  
  const [isEditing, setIsEditing] = useState(false)
  const [isNewCaseOpen, setIsNewCaseOpen] = useState(false)
  const [isLinkingOpen, setIsLinkingOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  
  // Case editing form state
  const [editNotes, setEditNotes] = useState("")
  const [editSummary, setEditSummary] = useState("")
  const [editPriority, setEditPriority] = useState("Medium")
  const [editStatus, setEditStatus] = useState("Open")

  // New Case form state
  const [newCaseId, setNewCaseId] = useState("")
  const [newInvestigator, setNewInvestigator] = useState("")
  const [newPriority, setNewPriority] = useState("Medium")
  const [newStatus, setNewStatus] = useState("Open")
  const [newSummary, setNewSummary] = useState("")
  const [newNotes, setNewNotes] = useState("")

  // Evidence upload file input
  const fileInputRef = useRef<HTMLInputElement>(null)
  const csvInputRef = useRef<HTMLInputElement>(null)
  const jsonInputRef = useRef<HTMLInputElement>(null)
  
  const [uploadDescription, setUploadDescription] = useState("")
  const [uploadTags, setUploadTags] = useState("")
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState("")

  // Note creation form state
  const [newNoteTitle, setNewNoteTitle] = useState("")
  const [newNoteContent, setNewNoteContent] = useState("")
  const [newNotePrivate, setNewNotePrivate] = useState(false)

  // Evidence custody transfer form
  const [selectedEvidenceForTransfer, setSelectedEvidenceForTransfer] = useState<any>(null)
  const [transferCustodian, setTransferCustodian] = useState("")
  const [transferLocation, setTransferLocation] = useState("")
  const [transferNotes, setTransferNotes] = useState("")

  // Load cases and entities on mount
  useEffect(() => {
    loadCases()
    loadEntities()
  }, [])

  const loadCases = async () => {
    try {
      const data = await casesApi.getCases()
      setCases(data)
      if (data.length > 0) {
        selectCase(data[0])
      }
    } catch (e) {
      console.error(e)
    }
  }

  const loadEntities = async () => {
    try {
      const data = await entitiesApi.getEntities()
      setAllEntities(data)
    } catch (e) {
      console.error(e)
    }
  }

  const selectCase = async (c: any) => {
    setSelectedCase(c)
    setEditSummary(c.summary)
    setEditNotes(c.notes || "")
    setEditPriority(c.priority)
    setEditStatus(c.status)
    setIsEditing(false)
    
    // Fetch associated case logs, evidence, and notes
    try {
      const logsData = await casesApi.getCaseActivity(c.id)
      setTimeline(logsData)
      
      const evData = await evidenceApi.getEvidenceForCase(c.id)
      setEvidence(evData)
      
      const notesData = await notesApi.getNotesForCase(c.id)
      setNotes(notesData)
    } catch (err) {
      console.error("Failed to load details for case:", c.id, err)
    }
  }

  // Save edits handler
  const handleSaveEdits = async () => {
    if (!selectedCase) return
    try {
      const updated = await casesApi.updateCase(selectedCase.id, {
        investigator: selectedCase.investigator,
        priority: editPriority,
        status: editStatus,
        summary: editSummary,
        notes: editNotes
      })
      
      // Refresh case details
      await selectCase(updated)
      await loadCases()
    } catch (e) {
      console.error(e)
    }
  }

  // Create new case handler
  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCaseId.trim() || !newInvestigator.trim()) return

    try {
      const created = await casesApi.createCase({
        investigator: newInvestigator.trim(),
        priority: newPriority,
        status: newStatus,
        summary: newSummary.trim() || "New case file initiated.",
        notes: newNotes.trim() || ""
      })
      
      await loadCases()
      await selectCase(created)
      setIsNewCaseOpen(false)

      // Reset form
      setNewCaseId("")
      setNewInvestigator("")
      setNewSummary("")
      setNewNotes("")
    } catch (err) {
      console.error(err)
    }
  }

  // Evidence file upload handler
  const handleEvidenceUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCase || !fileInputRef.current?.files?.[0]) return
    
    setUploading(true)
    setUploadError("")
    const file = fileInputRef.current.files[0]
    
    try {
      await evidenceApi.upload(
        selectedCase.id,
        file,
        uploadDescription,
        uploadTags
      )
      
      // Refresh details
      await selectCase(selectedCase)
      
      // Reset upload fields
      setUploadDescription("")
      setUploadTags("")
      if (fileInputRef.current) fileInputRef.current.value = ""
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload evidence.")
    } finally {
      setUploading(false)
    }
  }

  // Transfer of custody handler
  const handleTransferCustody = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedEvidenceForTransfer || !transferCustodian.trim()) return
    
    try {
      await evidenceApi.transferCustody(selectedEvidenceForTransfer.id, {
        new_custodian: transferCustodian,
        location: transferLocation,
        notes: transferNotes
      })
      
      await selectCase(selectedCase)
      setSelectedEvidenceForTransfer(null)
      setTransferCustodian("")
      setTransferLocation("")
      setTransferNotes("")
    } catch (err) {
      console.error(err)
    }
  }

  // Analyst Note creation handler
  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCase || !newNoteTitle.trim() || !newNoteContent.trim()) return
    
    try {
      await notesApi.createNote({
        case_id: selectedCase.id,
        title: newNoteTitle.trim(),
        content: newNoteContent.trim(),
        is_private: newNotePrivate
      })
      
      // Refresh notes list
      const notesData = await notesApi.getNotesForCase(selectedCase.id)
      setNotes(notesData)
      
      // Refresh timeline logs
      const logsData = await casesApi.getCaseActivity(selectedCase.id)
      setTimeline(logsData)
      
      setNewNoteTitle("")
      setNewNoteContent("")
      setNewNotePrivate(false)
    } catch (err) {
      console.error(err)
    }
  }

  // Link entity handler
  const handleToggleLinkEntity = async (entity: any) => {
    if (!selectedCase) return
    const isLinked = selectedCase.linked_entities?.some((e: any) => e.id === entity.id) || false
    
    try {
      if (isLinked) {
        await casesApi.unlinkEntity(selectedCase.id, entity.id)
      } else {
        await casesApi.linkEntity(selectedCase.id, entity.id)
      }
      
      // Reload active case
      const updated = await casesApi.getCase(selectedCase.id)
      await selectCase(updated)
    } catch (err) {
      console.error(err)
    }
  }

  // PDF report briefing exporter
  const handleExportPDF = async () => {
    if (!selectedCase) return
    try {
      await downloadPdfReport(selectedCase.id, selectedCase.case_id_str)
    } catch (err) {
      console.error("PDF Exporter failed:", err)
      // Fallback: trigger printing window print layout
      alert("FastAPI backend report downloader timed out. Check printer layout fallbacks.")
    }
  }

  // CSV Bulk Import
  const handleImportCsv = async () => {
    if (!selectedCase || !csvInputRef.current?.files?.[0]) return
    try {
      const file = csvInputRef.current.files[0]
      const res = await importApi.importCsv(selectedCase.id, file)
      alert(`Import Successful! Ingested ${res.imported} threat indicators.`)
      await selectCase(selectedCase)
      setIsImportOpen(false)
    } catch (err: any) {
      alert(err.message || "CSV Import Failed.")
    }
  }

  // JSON Bulk Import
  const handleImportJson = async () => {
    if (!selectedCase || !jsonInputRef.current?.files?.[0]) return
    try {
      const file = jsonInputRef.current.files[0]
      const res = await importApi.importJson(selectedCase.id, file)
      alert(`Import Successful! Ingested ${res.imported} threat indicators.`)
      await selectCase(selectedCase)
      setIsImportOpen(false)
    } catch (err: any) {
      alert(err.message || "JSON Import Failed.")
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[740px]">
      
      {/* Left Column: Active Cases list */}
      <div className="lg:col-span-1 bg-card border border-border rounded-lg p-4 space-y-4 flex flex-col overflow-hidden shadow-glow-blue">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold text-foreground">Active Case Files</h3>
            <p className="text-[10px] text-foreground/45">Investigation folders</p>
          </div>
          <button
            onClick={() => setIsNewCaseOpen(true)}
            className="p-1 bg-accent-blue hover:bg-accent-blue/90 text-white rounded cursor-pointer transition-colors"
            title="Create Case File"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-2 flex-1 overflow-y-auto pr-1">
          {cases.map((c) => {
            const isSelected = selectedCase && selectedCase.id === c.id
            return (
              <div
                key={c.id}
                onClick={() => selectCase(c)}
                className={`p-3.5 rounded border transition-all cursor-pointer flex flex-col space-y-1 ${
                  isSelected
                    ? "bg-card-hover border-accent-blue shadow-inner"
                    : "bg-[#0B1220]/40 border-border/40 hover:border-border"
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-mono text-accent-cyan font-bold text-xs">{c.case_id_str}</span>
                  <span className={`text-[8.5px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                    c.priority === "Critical" ? "bg-accent-rose/10 text-accent-rose border-accent-rose/25" :
                    c.priority === "High" ? "bg-accent-amber/10 text-accent-amber border-accent-amber/25" : "bg-accent-emerald/10 text-accent-emerald border-accent-emerald/25"
                  }`}>
                    {c.priority}
                  </span>
                </div>
                <h4 className="font-bold text-[11px] text-foreground/90 leading-snug line-clamp-1">{c.summary}</h4>
                <div className="text-[9px] text-foreground/40 mt-1">Investigator: {c.investigator}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Right Column: Case Details & Dossier */}
      {selectedCase ? (
        <div className="lg:col-span-3 bg-card border border-border rounded-lg p-6 flex flex-col overflow-hidden shadow-glow-blue">
          {/* Case Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-border/40 pb-4 mb-4 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-accent-cyan font-bold text-base bg-accent-blue/10 px-2 py-0.5 rounded">
                  {selectedCase.case_id_str}
                </span>
                <h2 className="text-lg font-bold text-foreground">Investigation dossier</h2>
              </div>
              <p className="text-xs text-foreground/60 flex items-center gap-2 mt-1">
                <User className="h-3.5 w-3.5 text-accent-blue" />
                <span>Lead Investigator: <strong className="text-foreground/95 font-medium">{selectedCase.investigator}</strong></span>
              </p>
            </div>

            <div className="flex gap-2 flex-wrap w-full md:w-auto">
              <button
                onClick={() => setIsImportOpen(true)}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-card hover:bg-card-hover border border-border text-xs text-foreground rounded cursor-pointer transition-all"
              >
                <Upload className="h-3.5 w-3.5 text-accent-cyan" />
                <span>Bulk Import</span>
              </button>
              <button
                onClick={handleExportPDF}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-card hover:bg-card-hover border border-border hover:border-accent-blue text-xs text-foreground rounded cursor-pointer transition-all"
              >
                <FileText className="h-4 w-4 text-accent-blue" />
                <span>Export PDF briefing</span>
              </button>
              {isEditing ? (
                <button
                  onClick={handleSaveEdits}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-accent-blue hover:bg-accent-blue/90 text-xs text-white rounded cursor-pointer transition-colors"
                >
                  <Save className="h-4 w-4" />
                  <span>Save changes</span>
                </button>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-card hover:bg-card-hover border border-border text-xs text-foreground rounded cursor-pointer transition-all"
                >
                  <Edit3 className="h-4 w-4 text-accent-cyan" />
                  <span>Modify dossier</span>
                </button>
              )}
            </div>
          </div>

          {/* Tabbed case workspace area */}
          <div className="flex-1 overflow-y-auto space-y-6 pr-1">
            
            {/* 1. Summary and Priority */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-[10px] text-foreground/45 uppercase font-semibold">Executive Summary</label>
                {isEditing ? (
                  <textarea
                    className="w-full bg-background border border-border rounded p-2.5 text-xs text-foreground focus:outline-none focus:border-accent-blue h-20 resize-none"
                    value={editSummary}
                    onChange={e => setEditSummary(e.target.value)}
                  />
                ) : (
                  <p className="text-xs text-foreground bg-[#0B1220]/40 p-3 border border-border/20 rounded-md leading-relaxed">
                    {selectedCase.summary}
                  </p>
                )}
              </div>

              <div className="space-y-3.5 bg-[#0B1220]/20 border border-border/30 p-3.5 rounded-lg flex flex-col justify-center">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-foreground/45">Priority Level:</span>
                  {isEditing ? (
                    <select
                      className="bg-background border border-border text-xs text-foreground rounded p-1"
                      value={editPriority}
                      onChange={e => setEditPriority(e.target.value)}
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  ) : (
                    <span className={`font-bold uppercase ${
                      selectedCase.priority === "Critical" ? "text-accent-rose" : "text-accent-amber"
                    }`}>{selectedCase.priority}</span>
                  )}
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-foreground/45">Dossier Status:</span>
                  {isEditing ? (
                    <select
                      className="bg-background border border-border text-xs text-foreground rounded p-1"
                      value={editStatus}
                      onChange={e => setEditStatus(e.target.value)}
                    >
                      <option value="Open">Open</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Under Review">Under Review</option>
                      <option value="Closed">Closed</option>
                    </select>
                  ) : (
                    <span className="font-bold text-accent-cyan">{selectedCase.status}</span>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Secure Evidence Inventory */}
            <div className="space-y-3">
              <label className="text-[10px] text-foreground/45 uppercase font-semibold block border-b border-border/40 pb-1">Forensic Evidence Inventory</label>
              
              {/* Evidence upload form */}
              <form onSubmit={handleEvidenceUpload} className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-[#0B1220]/30 border border-border/40 p-4 rounded-lg items-end">
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[9px] uppercase font-bold text-foreground/50">Forensic file</label>
                  <input
                    type="file"
                    required
                    ref={fileInputRef}
                    className="w-full text-xs text-slate-400 bg-background border border-border rounded-md px-2.5 py-1.5"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-foreground/50">Description</label>
                  <input
                    type="text"
                    placeholder="Log details..."
                    className="w-full bg-background border border-border rounded-md px-2.5 py-1.5 text-xs text-foreground focus:outline-none"
                    value={uploadDescription}
                    onChange={(e) => setUploadDescription(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  disabled={uploading}
                  className="w-full py-1.5 bg-accent-blue hover:bg-accent-blue/90 text-white font-bold rounded text-xs cursor-pointer flex justify-center items-center gap-1.5"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>{uploading ? "Ingesting..." : "Upload specimen"}</span>
                </button>
              </form>

              {uploadError && <p className="text-xs text-accent-rose font-bold">{uploadError}</p>}

              {/* Evidence inventory table */}
              <div className="overflow-x-auto border border-border/40 rounded-lg">
                <table className="w-full text-xs text-left border-collapse bg-[#0B1220]/20">
                  <thead className="bg-[#0B1220]/60 text-foreground/60 uppercase text-[9px] tracking-wider border-b border-border/40">
                    <tr>
                      <th className="p-3">Specimen name</th>
                      <th className="p-3">File size</th>
                      <th className="p-3">SHA256 checksum</th>
                      <th className="p-3">Current Custodian</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {evidence.map((ev) => (
                      <tr key={ev.id} className="border-b border-border/20 hover:bg-card-hover/20">
                        <td className="p-3 font-semibold text-foreground/90">{ev.filename}</td>
                        <td className="p-3 text-foreground/60">{ev.file_size ? `${(ev.file_size / 1024).toFixed(1)} KB` : "0 KB"}</td>
                        <td className="p-3 font-mono text-[10px] text-accent-cyan" title={ev.sha256_hash}>
                          {ev.sha256_hash.slice(0, 12)}...{ev.sha256_hash.slice(-6)}
                        </td>
                        <td className="p-3 font-medium text-slate-300">
                          {ev.chain?.[ev.chain.length - 1]?.custodian || ev.uploaded_by}
                        </td>
                        <td className="p-3 text-right space-x-2">
                          <button
                            onClick={() => setSelectedEvidenceForTransfer(ev)}
                            className="text-[10px] text-accent-amber hover:underline hover:text-accent-amber/90 cursor-pointer"
                          >
                            Transfer Custody
                          </button>
                          <a
                            href={evidenceApi.getDownloadUrl(ev.id)}
                            className="text-[10px] text-accent-blue hover:underline hover:text-accent-blue/90 inline-flex items-center gap-1 cursor-pointer"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Download className="h-3 w-3" />
                            <span>Download</span>
                          </a>
                        </td>
                      </tr>
                    ))}
                    {evidence.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-foreground/45 italic">
                          No forensic specimens uploaded. Ingest logs or malware binaries above.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3. Analyst Notes with Version History */}
            <div className="space-y-4">
              <label className="text-[10px] text-foreground/45 uppercase font-semibold block border-b border-border/40 pb-1">Analyst Notes & Version Logs</label>
              
              {/* Note editor form */}
              <form onSubmit={handleCreateNote} className="space-y-3 bg-[#0B1220]/20 border border-border/40 p-4 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    type="text"
                    required
                    placeholder="Brief note title..."
                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-xs text-foreground focus:outline-none focus:border-accent-blue md:col-span-2"
                    value={newNoteTitle}
                    onChange={(e) => setNewNoteTitle(e.target.value)}
                  />
                  <div className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      id="is-private"
                      className="cursor-pointer bg-background"
                      checked={newNotePrivate}
                      onChange={(e) => setNewNotePrivate(e.target.checked)}
                    />
                    <label htmlFor="is-private" className="text-foreground/60 cursor-pointer select-none">Restrict as private note</label>
                  </div>
                </div>
                
                <textarea
                  required
                  placeholder="Draft your analysis report here... TIP: Reference indicators by wrapping them, e.g. [[185.123.45.67]] or [[upgrade-microsoft-service.com]]"
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-xs text-foreground focus:outline-none focus:border-accent-blue h-24 font-mono leading-relaxed"
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                />
                
                <button
                  type="submit"
                  className="px-4 py-2 bg-accent-blue hover:bg-accent-blue/90 text-white font-bold rounded text-xs cursor-pointer ml-auto block"
                >
                  Log Analysis Report
                </button>
              </form>

              {/* Notes list */}
              <div className="space-y-3">
                {notes.map((note) => (
                  <div key={note.id} className="p-4 bg-[#0B1220]/30 border border-border/30 rounded-lg space-y-2">
                    <div className="flex justify-between items-center border-b border-border/20 pb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-foreground/90">{note.title}</span>
                        {note.is_private && (
                          <span className="text-[8px] bg-accent-rose/10 text-accent-rose border border-accent-rose/20 px-1 rounded uppercase tracking-wider font-extrabold">Private Note</span>
                        )}
                      </div>
                      <div className="text-[10px] text-foreground/45 flex items-center gap-1">
                        <span>Author: <strong>{note.created_by}</strong></span>
                        <span>•</span>
                        <span>v{note.versions?.length || 1}</span>
                      </div>
                    </div>
                    <pre className="text-xs text-foreground/80 font-mono whitespace-pre-wrap leading-relaxed">
                      {note.content}
                    </pre>
                    
                    {/* Note version logs if present */}
                    {note.versions?.length > 1 && (
                      <div className="bg-[#080E1A]/40 p-2.5 rounded border border-border/20 text-[10px] space-y-1.5 mt-2">
                        <div className="font-bold text-foreground/50 uppercase tracking-wider flex items-center gap-1.5">
                          <History className="h-3.5 w-3.5" />
                          <span>Version edits history</span>
                        </div>
                        {note.versions.map((ver: any) => (
                          <div key={ver.id} className="flex justify-between items-center text-foreground/40 hover:text-foreground/70 transition-colors">
                            <span>Modified by {ver.modified_by} on {new Date(ver.modified_at).toLocaleString()}</span>
                            <span className="font-mono bg-background border border-border/40 px-1 rounded">v{ver.version}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Chronological timeline events */}
            <div className="space-y-4">
              <label className="text-[10px] text-foreground/45 uppercase font-semibold block border-b border-border/40 pb-1">Chronological Activity Log & Audits</label>
              <div className="bg-[#0B1220]/20 border border-border/30 rounded-lg p-5">
                <div className="relative border-l-2 border-border/40 pl-5 space-y-5 text-xs py-1">
                  {timeline.map((event) => (
                    <div key={event.id} className="relative">
                      <span className={`absolute -left-[26px] top-0.5 h-3.5 w-3.5 rounded-full border-2 border-card flex items-center justify-center ${
                        event.activity_type === "Case Created" ? "bg-accent-emerald" :
                        event.activity_type === "Evidence Uploaded" ? "bg-accent-cyan" :
                        event.activity_type === "Entity Linked" ? "bg-accent-blue" : "bg-accent-amber"
                      }`} />
                      
                      <div className="flex justify-between items-center text-[10px] text-foreground/40 font-mono mb-0.5">
                        <span>{new Date(event.timestamp).toLocaleString()}</span>
                        <span className="font-bold">Investigator: {event.performed_by}</span>
                      </div>
                      
                      <h5 className="font-bold text-foreground/90">{event.activity_type}</h5>
                      <p className="text-foreground/60 text-[11px] mt-0.5 leading-relaxed">{event.description}</p>
                    </div>
                  ))}
                  {timeline.length === 0 && (
                    <p className="text-foreground/45 italic text-center py-4">No audit events generated yet.</p>
                  )}
                </div>
              </div>
            </div>

            {/* 5. Linked Threat Intelligence Entities */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] text-foreground/45 uppercase font-semibold">Linked Threat Intelligence Dossier</label>
                <button
                  onClick={() => setIsLinkingOpen(true)}
                  className="text-[10px] text-accent-blue hover:text-accent-blue/80 flex items-center gap-1 hover:underline cursor-pointer font-bold"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Link Intel Entity</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                {selectedCase.linked_entities?.map((e: any, idx: number) => (
                  <div key={idx} className="bg-[#0B1220]/40 border border-border/30 px-3 py-2 rounded flex justify-between items-center text-xs">
                    <div className="truncate pr-2">
                      <span className="text-[9px] uppercase tracking-wider text-accent-blue font-bold block">{e.type}</span>
                      <span className="font-semibold text-foreground/85 truncate block mt-0.5">{e.name}</span>
                    </div>
                    <button
                      onClick={() => handleToggleLinkEntity({ id: e.id, value: e.name, type: e.type })}
                      className="text-foreground/30 hover:text-accent-rose transition-colors cursor-pointer"
                      title="Remove Link"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {(!selectedCase.linked_entities || selectedCase.linked_entities.length === 0) && (
                  <div className="col-span-full border border-dashed border-border/40 p-4 rounded text-center text-xs text-foreground/40">
                    No forensic entities linked. Use &ldquo;Link Intel Entity&rdquo; to associate IP addresses, domains, cryptocurrency wallets, or phone numbers.
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      ) : (
        <div className="lg:col-span-3 bg-card border border-border rounded-lg flex flex-col justify-center items-center p-12 text-center text-foreground/50 shadow-glow-blue">
          <Briefcase className="h-10 w-10 text-accent-blue animate-pulse mb-3" />
          <h3 className="text-sm font-bold text-foreground">Select an Active Case</h3>
          <p className="text-xs text-foreground/50 mt-1 max-w-xs">Click on any investigation file folder in the left panel to review executive summaries, chain-of-custody, and notes.</p>
        </div>
      )}

      {/* dialog 1: Create Case Dialog */}
      <Dialog open={isNewCaseOpen} onOpenChange={setIsNewCaseOpen}>
        <DialogContent onClose={() => setIsNewCaseOpen(false)} className="max-w-md">
          <DialogHeader>
            <DialogTitle>Initiate Investigation Case</DialogTitle>
            <DialogDescription>Create a secure law enforcement incident record.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateCase} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-foreground/60 font-semibold uppercase text-[9px]">Case ID Reference</label>
                <input
                  type="text"
                  placeholder="TL-2026-XXXX"
                  required
                  className="w-full bg-background border border-border/80 rounded p-2 text-foreground focus:outline-none"
                  value={newCaseId}
                  onChange={e => setNewCaseId(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-foreground/60 font-semibold uppercase text-[9px]">Lead Investigator</label>
                <input
                  type="text"
                  placeholder="Special Agent Name"
                  required
                  className="w-full bg-background border border-border/80 rounded p-2 text-foreground focus:outline-none"
                  value={newInvestigator}
                  onChange={e => setNewInvestigator(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-foreground/60 font-semibold uppercase text-[9px]">Priority Level</label>
                <select
                  className="w-full bg-background border border-border/80 rounded p-2 text-foreground focus:outline-none"
                  value={newPriority}
                  onChange={e => setNewPriority(e.target.value)}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-foreground/60 font-semibold uppercase text-[9px]">Initial Status</label>
                <select
                  className="w-full bg-background border border-border/80 rounded p-2 text-foreground focus:outline-none"
                  value={newStatus}
                  onChange={e => setNewStatus(e.target.value)}
                >
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Under Review">Under Review</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-foreground/60 font-semibold uppercase text-[9px]">Executive Summary</label>
              <textarea
                placeholder="Brief summary of the incident..."
                required
                className="w-full bg-background border border-border/80 rounded p-2 text-foreground focus:outline-none h-16 resize-none"
                value={newSummary}
                onChange={e => setNewSummary(e.target.value)}
              />
            </div>

            <DialogFooter>
              <button
                type="button"
                onClick={() => setIsNewCaseOpen(false)}
                className="px-4 py-2 bg-card hover:bg-card-hover border border-border text-foreground rounded cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-accent-blue hover:bg-accent-blue/90 text-white font-bold rounded cursor-pointer"
              >
                Create File
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* dialog 2: Link Entity Dialog */}
      <Dialog open={isLinkingOpen} onOpenChange={setIsLinkingOpen}>
        <DialogContent onClose={() => setIsLinkingOpen(false)} className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Link Threat Intelligence Entity</DialogTitle>
            <DialogDescription>Select assets to link to case dossier {selectedCase?.case_id_str}.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1 text-xs">
            {/* IOCs list */}
            <div className="space-y-2">
              <h4 className="font-bold text-foreground/75 border-b border-border/40 pb-1">Indicators of Compromise & Intelligence Entities</h4>
              <div className="space-y-1">
                {allEntities.map((ent) => {
                  const isLinked = selectedCase?.linked_entities?.some((e: any) => e.id === ent.id) || false
                  return (
                    <div
                      key={ent.id}
                      onClick={() => handleToggleLinkEntity(ent)}
                      className="flex items-center justify-between p-2 rounded bg-[#0B1220]/40 border border-border/20 hover:border-accent-blue/30 cursor-pointer"
                    >
                      <div className="truncate pr-4">
                        <span className="font-mono text-accent-cyan font-semibold block">{ent.value}</span>
                        <span className="text-[9px] text-foreground/45 block">{ent.type}</span>
                      </div>
                      {isLinked ? (
                        <CheckSquare className="h-4 w-4 text-accent-blue" />
                      ) : (
                        <Square className="h-4 w-4 text-foreground/35" />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <button
              onClick={() => setIsLinkingOpen(false)}
              className="px-4 py-2 bg-accent-blue hover:bg-accent-blue/90 text-white font-bold rounded cursor-pointer w-full"
            >
              Done Linking
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* dialog 3: Bulk Import Ingestion Dialog */}
      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent onClose={() => setIsImportOpen(false)} className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Ingestion Portal</DialogTitle>
            <DialogDescription>Import external feeds of threat intelligence indicators to case dossier {selectedCase?.case_id_str}.</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 text-xs p-2">
            
            {/* Import CSV */}
            <div className="p-4 bg-[#0B1220]/30 border border-border/30 rounded-lg space-y-3">
              <h4 className="font-bold text-foreground/85 flex items-center gap-1.5">
                <FileSpreadsheet className="h-4 w-4 text-accent-emerald" />
                <span>Import CSV Indicators File</span>
              </h4>
              <p className="text-[10px] text-foreground/50">Expected headers: <code>value, type, risk_score, threat_level, description, tags</code></p>
              
              <div className="flex gap-2">
                <input
                  type="file"
                  ref={csvInputRef}
                  accept=".csv"
                  className="bg-background border border-border/80 rounded p-1 text-[11px] text-slate-400 w-full"
                />
                <button
                  onClick={handleImportCsv}
                  className="px-3 py-1 bg-accent-emerald hover:bg-accent-emerald/90 text-white font-bold rounded text-[11px] cursor-pointer"
                >
                  Ingest CSV
                </button>
              </div>
            </div>

            {/* Import JSON */}
            <div className="p-4 bg-[#0B1220]/30 border border-border/30 rounded-lg space-y-3">
              <h4 className="font-bold text-foreground/85 flex items-center gap-1.5">
                <FileJson className="h-4 w-4 text-accent-blue" />
                <span>Import JSON Intelligence Feed</span>
              </h4>
              <p className="text-[10px] text-foreground/50">Expected array format containing objects with indicator keys.</p>
              
              <div className="flex gap-2">
                <input
                  type="file"
                  ref={jsonInputRef}
                  accept=".json"
                  className="bg-background border border-border/80 rounded p-1 text-[11px] text-slate-400 w-full"
                />
                <button
                  onClick={handleImportJson}
                  className="px-3 py-1 bg-accent-blue hover:bg-accent-blue/90 text-white font-bold rounded text-[11px] cursor-pointer"
                >
                  Ingest JSON
                </button>
              </div>
            </div>

          </div>

          <DialogFooter>
            <button
              onClick={() => setIsImportOpen(false)}
              className="px-4 py-1.5 bg-card hover:bg-card-hover border border-border text-foreground rounded cursor-pointer w-full text-xs"
            >
              Cancel
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* dialog 4: Evidence Transfer Dialog */}
      <Dialog open={selectedEvidenceForTransfer !== null} onOpenChange={() => setSelectedEvidenceForTransfer(null)}>
        <DialogContent onClose={() => setSelectedEvidenceForTransfer(null)} className="max-w-md">
          <DialogHeader>
            <DialogTitle>Chain of Custody Transfer</DialogTitle>
            <DialogDescription>Log custodial transfer for specimen &ldquo;{selectedEvidenceForTransfer?.filename}&rdquo;.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleTransferCustody} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="text-foreground/60 font-semibold uppercase text-[9px]">New Custodian</label>
              <input
                type="text"
                required
                placeholder="Custodian name or badge number..."
                className="w-full bg-background border border-border/85 rounded p-2 text-foreground focus:outline-none"
                value={transferCustodian}
                onChange={e => setTransferCustodian(e.target.value)}
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-foreground/60 font-semibold uppercase text-[9px]">Vault Transfer Location</label>
              <input
                type="text"
                placeholder="Physical shelf, device vault, offline drive..."
                className="w-full bg-background border border-border/85 rounded p-2 text-foreground focus:outline-none"
                value={transferLocation}
                onChange={e => setTransferLocation(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-foreground/60 font-semibold uppercase text-[9px]">Transfer Audit Notes</label>
              <textarea
                placeholder="Reasons for custody transfer, forensic analysis requirements..."
                className="w-full bg-background border border-border/85 rounded p-2 text-foreground focus:outline-none h-16 resize-none"
                value={transferNotes}
                onChange={e => setTransferNotes(e.target.value)}
              />
            </div>

            <DialogFooter>
              <button
                type="button"
                onClick={() => setSelectedEvidenceForTransfer(null)}
                className="px-4 py-2 bg-card hover:bg-card-hover border border-border text-slate-400 rounded cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-accent-amber hover:bg-accent-amber/90 text-white font-bold rounded cursor-pointer"
              >
                Log Custody Release
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  )
}
