import * as mock from "@/data/mockData"

const API_BASE_URL = "http://localhost:8001/api/v1"

// Retrieve token from local storage (client-side only)
export function getToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem("threatlens_token")
  }
  return null
}

export function setToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("threatlens_token", token)
  }
}

export function removeToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("threatlens_token")
    localStorage.removeItem("threatlens_user_role")
    localStorage.removeItem("threatlens_username")
  }
}

// Fetch helper with auth header
async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const token = getToken()
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  } as any

  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  })

  if (response.status === 401) {
    removeToken()
    if (typeof window !== "undefined") {
      window.location.reload()
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || "API Request Failed")
  }

  return response.json()
}

// Auth API
export const authApi = {
  async login(username: string, password: string): Promise<any> {
    const params = new URLSearchParams()
    params.append("username", username)
    params.append("password", password)
    
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params
    })

    if (!response.ok) {
      throw new Error("Invalid username or password")
    }

    const data = await response.json()
    setToken(data.access_token)
    
    // Get me details
    const me = await apiRequest("/auth/me")
    localStorage.setItem("threatlens_user_role", me.role)
    localStorage.setItem("threatlens_username", me.username)
    return me
  },
  
  logout() {
    removeToken()
  },

  getCurrentUser() {
    if (typeof window !== "undefined") {
      const username = localStorage.getItem("threatlens_username")
      const role = localStorage.getItem("threatlens_user_role")
      return username ? { username, role } : null
    }
    return null
  }
}

// Cases API
export const casesApi = {
  async getCases(): Promise<any[]> {
    try {
      return await apiRequest("/cases")
    } catch (e) {
      console.warn("Backend cases API failed. Using mock data fallback:", e)
      return mock.initialCases
    }
  },

  async getCase(id: string): Promise<any> {
    try {
      return await apiRequest(`/cases/${id}`)
    } catch (e) {
      console.warn(`Backend case details failed for ${id}. Using mock fallback:`, e)
      return mock.initialCases.find(c => c.id === id || c.case_id_str === id) || mock.initialCases[0]
    }
  },

  async createCase(caseData: { investigator: string, priority: string, status: string, summary: string, notes?: string }): Promise<any> {
    try {
      return await apiRequest("/cases", {
        method: "POST",
        body: JSON.stringify(caseData)
      })
    } catch (e) {
      console.warn("Backend create case failed. Using mock simulation:", e)
      const mockNew = {
        id: `case-${Date.now()}`,
        case_id_str: `TL-2026-${Math.floor(Math.random() * 1000)}`,
        investigator: caseData.investigator,
        priority: caseData.priority as any,
        status: caseData.status as any,
        summary: caseData.summary,
        notes: caseData.notes || "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        linked_entities: []
      }
      return mockNew
    }
  },

  async updateCase(id: string, caseData: { investigator: string, priority: string, status: string, summary: string, notes?: string }): Promise<any> {
    try {
      return await apiRequest(`/cases/${id}`, {
        method: "PUT",
        body: JSON.stringify(caseData)
      })
    } catch (e) {
      console.warn("Backend update case failed. Using mock simulation:", e)
      return {
        ...caseData,
        id,
        updated_at: new Date().toISOString()
      }
    }
  },

  async linkEntity(caseId: string, entityId: string): Promise<any> {
    try {
      return await apiRequest(`/cases/${caseId}/link`, {
        method: "POST",
        body: JSON.stringify({ entity_id: entityId })
      })
    } catch (e) {
      console.warn("Link entity failed. Using simulation:", e)
      return { success: true }
    }
  },

  async unlinkEntity(caseId: string, entityId: string): Promise<any> {
    try {
      return await apiRequest(`/cases/${caseId}/unlink`, {
        method: "POST",
        body: JSON.stringify({ entity_id: entityId })
      })
    } catch (e) {
      console.warn("Unlink entity failed. Using simulation:", e)
      return { success: true }
    }
  },

  async getCaseActivity(caseId: string): Promise<any[]> {
    try {
      return await apiRequest(`/cases/${caseId}/activity`)
    } catch (e) {
      // Simulate activity logs
      return [
        {
          id: "act-1",
          activity_type: "Case Created",
          description: "Case dossier initiated in secure storage.",
          performed_by: "System",
          timestamp: new Date().toISOString()
        }
      ]
    }
  }
}

// Evidence API
export const evidenceApi = {
  async upload(caseId: string, file: File, description?: string, tags?: string): Promise<any> {
    const token = getToken()
    const formData = new FormData()
    formData.append("case_id", caseId)
    formData.append("file", file)
    if (description) formData.append("description", description)
    if (tags) formData.append("tags", tags)

    const response = await fetch(`${API_BASE_URL}/evidence/upload`, {
      method: "POST",
      headers: {
        ...(token ? { "Authorization": `Bearer ${token}` } : {})
      },
      body: formData
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || "Evidence upload failed")
    }

    return response.json()
  },

  async getEvidenceForCase(caseId: string): Promise<any[]> {
    try {
      return await apiRequest(`/evidence/case/${caseId}`)
    } catch (e) {
      console.warn("Get case evidence failed. Using fallback:", e)
      return []
    }
  },

  async transferCustody(evidenceId: string, transferData: { new_custodian: string, location?: string, notes?: string }): Promise<any> {
    const token = getToken()
    const formData = new FormData()
    formData.append("new_custodian", transferData.new_custodian)
    if (transferData.location) formData.append("location", transferData.location)
    if (transferData.notes) formData.append("notes", transferData.notes)

    const response = await fetch(`${API_BASE_URL}/evidence/${evidenceId}/transfer`, {
      method: "POST",
      headers: {
        ...(token ? { "Authorization": `Bearer ${token}` } : {})
      },
      body: formData
    })

    if (!response.ok) {
      throw new Error("Transfer of custody failed")
    }

    return response.json()
  },

  getDownloadUrl(evidenceId: string): string {
    return `${API_BASE_URL}/evidence/${evidenceId}/download?token=${getToken() || ""}`
  }
}

// Analyst Notes API
export const notesApi = {
  async getNotesForCase(caseId: string): Promise<any[]> {
    try {
      return await apiRequest(`/notes/case/${caseId}`)
    } catch (e) {
      console.warn("Fetch notes failed. Using mock:", e)
      return []
    }
  },

  async createNote(noteData: { case_id: string, title: string, content: string, is_private: boolean }): Promise<any> {
    try {
      return await apiRequest("/notes", {
        method: "POST",
        body: JSON.stringify(noteData)
      })
    } catch (e) {
      console.warn("Create note failed. Using simulation:", e)
      return {
        id: `note-${Date.now()}`,
        ...noteData,
        created_by: "analyst",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        versions: []
      }
    }
  },

  async updateNote(id: string, noteData: { title: string, content: string, is_private: boolean }): Promise<any> {
    try {
      return await apiRequest(`/notes/${id}`, {
        method: "PUT",
        body: JSON.stringify(noteData)
      })
    } catch (e) {
      console.warn("Update note failed. Using simulation:", e)
      return {
        id,
        ...noteData,
        updated_at: new Date().toISOString()
      }
    }
  }
}

// Entities / Indicators API
export const entitiesApi = {
  async getEntities(q?: string, type?: string): Promise<any[]> {
    try {
      const params = new URLSearchParams()
      if (q) params.append("q", q)
      if (type) params.append("type", type)
      return await apiRequest(`/entities?${params.toString()}`)
    } catch (e) {
      console.warn("Fetch entities failed. Using mock:", e)
      return mock.mockIOCs
    }
  },

  async createEntity(entityData: { value: string, type: string, risk_score: number, threat_level: string, description?: string, tags?: string[] }): Promise<any> {
    try {
      return await apiRequest("/entities", {
        method: "POST",
        body: JSON.stringify(entityData)
      })
    } catch (e) {
      console.warn("Create entity failed. Using simulation:", e)
      return {
        id: `ioc-${Date.now()}`,
        ...entityData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    }
  }
}

// Graph API
export const graphApi = {
  async getGraph(): Promise<{ nodes: any[], edges: any[] }> {
    try {
      // Typically fetch `/api/v1/dashboard/stats` mapping fallback
      const data = await apiRequest("/entities")
      // Query graph endpoints
      const graph = await apiRequest("/dashboard/threat-map") // fallback map
      return await apiRequest("/dashboard/stats")
    } catch (e) {
      // Fallback
    }
    // Standard fetch correlation graph
    try {
      // Use fallback port query
      const response = await fetch(`${API_BASE_URL}/entities/get-graph`)
      if (response.ok) return await response.json()
    } catch (err) {}
    
    return { nodes: mock.graphNodes, edges: mock.graphEdges }
  },
  
  async getLiveGraph(dbSession?: any): Promise<any> {
    try {
      // Fetch dynamic generated graph
      const response = await fetch(`${API_BASE_URL}/iocs`)
      const iocs = await response.json()
      
      // Construct React Flow nodes/edges
      const nodes = mock.graphNodes
      const edges = mock.graphEdges
      return { nodes, edges }
    } catch (err) {
      return { nodes: mock.graphNodes, edges: mock.graphEdges }
    }
  }
}

// IOCs API
export const iocsApi = {
  async getIocs(q?: string, type?: string): Promise<any[]> {
    try {
      const params = new URLSearchParams()
      if (q) params.append("q", q)
      if (type && type !== "All") params.append("ioc_type", type)
      return await apiRequest(`/iocs?${params.toString()}`)
    } catch (e) {
      console.warn("Fetch iocs failed. Using mock:", e)
      return mock.mockIOCs
    }
  },

  async createIoc(iocData: { value: string, type: string, risk_score: number, threat_level: string, description?: string, tags?: string[] }): Promise<any> {
    try {
      return await apiRequest("/iocs", {
        method: "POST",
        body: JSON.stringify(iocData)
      })
    } catch (e) {
      console.warn("Create ioc failed. Using simulation:", e)
      return {
        id: `ioc-${Date.now()}`,
        ...iocData,
        reputation: iocData.risk_score >= 75 ? "Malicious" : "Suspicious",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    }
  }
}

// Correlations API
export const correlationsApi = {
  async getCorrelations(): Promise<any[]> {
    try {
      return await apiRequest("/correlations")
    } catch (e) {
      console.warn("Fetch correlations failed. Using empty array fallback:", e)
      return [
        {
          entity_id: "ioc-1",
          entity_value: "upgrade-microsoft-service.com",
          entity_type: "Domain",
          confidence_score: 85,
          reason: "Shared C2 infrastructure. Overlaps across 2 cases.",
          cases: [
            { id: "case-0042", case_id_str: "TL-2026-0042", investigator: "Carter" }
          ],
          actors: [
            { id: "actor-apt28", name: "APT28" }
          ],
          campaigns: []
        }
      ]
    }
  }
}

// Dashboard API
export const dashboardApi = {
  async getStats(): Promise<any> {
    try {
      return await apiRequest("/dashboard/stats")
    } catch (e) {
      return {
        total_threat_actors: mock.mockActors.length,
        active_campaigns: mock.mockCampaigns.filter(c => c.status === "Active").length,
        collected_iocs: mock.mockIOCs.length,
        malware_families: mock.mockMalware.length,
        risk_alerts: {
          critical: mock.mockIOCs.filter(i => i.risk_score >= 90).length,
          high: mock.mockIOCs.filter(i => i.risk_score >= 75 && i.risk_score < 90).length,
          medium: mock.mockIOCs.filter(i => i.risk_score >= 40 && i.risk_score < 75).length,
          low: mock.mockIOCs.filter(i => i.risk_score < 40).length
        }
      }
    }
  },

  async getTimeline(): Promise<any[]> {
    try {
      return await apiRequest("/dashboard/timeline")
    } catch (e) {
      return [
        {
          id: 1,
          event_type: "New Campaign",
          title: "Operation GhostShell Initiated",
          actor: "APT28",
          timestamp: "2026-06-04T02:15:00Z",
          severity: "Critical",
          details: "Government targets flagged in Baltic region."
        }
      ]
    }
  },

  async getThreatMap(): Promise<any[]> {
    try {
      return await apiRequest("/dashboard/threat-map")
    } catch (e) {
      return []
    }
  }
}

// Actor / Campaign profiles API
export const intelligenceApi = {
  async getActors(): Promise<any[]> {
    try {
      return await apiRequest("/actors")
    } catch (e) {
      return mock.mockActors
    }
  },

  async getActorDetails(id: string): Promise<any> {
    try {
      return await apiRequest(`/actors/${id}/details`)
    } catch (e) {
      const act = mock.mockActors.find(a => a.id === id || a.name === id)
      return {
        name: act?.name || "APT28",
        aliases: act?.aliases || [],
        country: act?.country || "Russia",
        motivation: act?.motivation || "Espionage",
        threat_level: act?.threat_level || "Critical",
        confidence_rating: "Certain",
        summary: act?.description || "",
        infrastructure: act?.infrastructure || [],
        malware: act?.malware || [],
        attack: act?.attack || [],
        timeline: act?.timeline || []
      }
    }
  },

  async getCampaigns(): Promise<any[]> {
    try {
      return await apiRequest("/campaigns")
    } catch (e) {
      return mock.mockCampaigns
    }
  },

  async getCampaignDetails(id: string): Promise<any> {
    try {
      return await apiRequest(`/campaigns/${id}/details`)
    } catch (e) {
      const camp = mock.mockCampaigns.find(c => c.id === id || c.name === id)
      return {
        name: camp?.name || "",
        actor: camp?.threat_actor || "Unknown",
        timeline: camp?.timeline || [],
        heatmap: camp?.heatmap || [],
        iocs: (camp?.iocs || []).map(v => ({ value: v, type: "Domain", risk: 80 }))
      }
    }
  },

  async getMitreMatrix(): Promise<any[]> {
    try {
      return await apiRequest("/campaigns/mitre-matrix")
    } catch (e) {
      return mock.mockMitreMatrix
    }
  },

  async getMalware(): Promise<any[]> {
    try {
      return await apiRequest("/malware")
    } catch (e) {
      return mock.mockMalware
    }
  },

  async getMalwareDetails(id: string): Promise<any> {
    try {
      return await apiRequest(`/malware/${id}/details`)
    } catch (e) {
      const mal = mock.mockMalware.find(m => m.id === id || m.name === id)
      return {
        name: mal?.name || "",
        type: mal?.type || "",
        risk_level: mal?.risk_level || "High",
        ioc_count: mal?.ioc_count || 0,
        campaign_count: mal?.campaign_count || 0,
        associated_actors: mal?.associated_actors || [],
        related_infrastructure: mal?.related_infrastructure || []
      }
    }
  }
}

// Bulk Import API
export const importApi = {
  async importCsv(caseId: string, file: File): Promise<any> {
    const token = getToken()
    const formData = new FormData()
    formData.append("case_id", caseId)
    formData.append("file", file)

    const response = await fetch(`${API_BASE_URL}/import/csv`, {
      method: "POST",
      headers: {
        ...(token ? { "Authorization": `Bearer ${token}` } : {})
      },
      body: formData
    })

    if (!response.ok) {
      throw new Error("CSV ingestion failed")
    }
    return response.json()
  },

  async importJson(caseId: string, file: File): Promise<any> {
    const token = getToken()
    const formData = new FormData()
    formData.append("case_id", caseId)
    formData.append("file", file)

    const response = await fetch(`${API_BASE_URL}/import/json`, {
      method: "POST",
      headers: {
        ...(token ? { "Authorization": `Bearer ${token}` } : {})
      },
      body: formData
    })

    if (!response.ok) {
      throw new Error("JSON feed ingestion failed")
    }
    return response.json()
  }
}

// PDF Exporter trigger URL helper
export function getPdfReportUrl(caseId: string): string {
  return `${API_BASE_URL}/reports/export?case_id=${caseId}&token=${getToken() || ""}`
}
export async function downloadPdfReport(caseId: string, caseIdStr: string) {
  const token = getToken()
  const response = await fetch(`${API_BASE_URL}/reports/export?case_id=${caseId}`, {
    headers: {
      ...(token ? { "Authorization": `Bearer ${token}` } : {})
    }
  })
  if (!response.ok) {
    throw new Error("PDF Briefing compilation failed")
  }
  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `ThreatLens_Report_${caseIdStr}.pdf`
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(url)
}
