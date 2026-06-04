"use client"

import React, { useState, useRef, useEffect, MouseEvent } from "react"
import { Search, ZoomIn, ZoomOut, RotateCcw, Shield, HelpCircle, Activity, Globe, Info } from "lucide-react"
import { GraphNode, GraphEdge } from "@/data/mockData"
import { graphApi } from "@/lib/api"

export default function CorrelationGraph() {
  // Graph view states
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [edges, setEdges] = useState<GraphEdge[]>([])
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    let active = true
    async function loadGraph() {
      try {
        const data = await graphApi.getGraph()
        if (active && data) {
          setNodes(data.nodes)
          setEdges(data.edges)
        }
      } catch (err) {
        console.error("Failed to load graph:", err)
      }
    }
    loadGraph()
    return () => {
      active = false
    }
  }, [])
  
  // SVG pan and zoom state
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  
  // Dragging node state
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  
  const svgRef = useRef<SVGSVGElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  // Zoom In/Out/Reset Handlers
  const handleZoomIn = () => setZoom(z => Math.min(z + 0.1, 2.5))
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.1, 0.4))
  const handleReset = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
    setSelectedNode(null)
    setSearchQuery("")
  }

  // Pan Handlers (Mouse Drag on Background)
  const handleMouseDown = (e: MouseEvent<SVGSVGElement>) => {
    if (e.target === svgRef.current) {
      setIsPanning(true)
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
    }
  }

  const handleMouseMove = (e: MouseEvent<SVGSVGElement>) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      })
    } else if (draggedNodeId) {
      // Dragging node logic
      if (!svgRef.current) return
      const rect = svgRef.current.getBoundingClientRect()
      // Translate screen coordinates to SVG coordinates
      const x = (e.clientX - rect.left - pan.x) / zoom
      const y = (e.clientY - rect.top - pan.y) / zoom
      
      setNodes(prevNodes =>
        prevNodes.map(node =>
          node.id === draggedNodeId
            ? { ...node, x: x - dragOffset.x, y: y - dragOffset.y }
            : node
        )
      )
    }
  }

  const handleMouseUp = () => {
    setIsPanning(false)
    setDraggedNodeId(null)
  }

  // Node Drag Handlers
  const handleNodeMouseDown = (e: React.MouseEvent, node: GraphNode) => {
    e.stopPropagation()
    setSelectedNode(node)
    setDraggedNodeId(node.id)
    
    if (!svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    // Calculate cursor offset from node center in SVG space
    const clickX = (e.clientX - rect.left - pan.x) / zoom
    const clickY = (e.clientY - rect.top - pan.y) / zoom
    setDragOffset({
      x: clickX - node.x,
      y: clickY - node.y
    })
  }

  // Highlight logic based on search or selections
  const getHighlightDetails = (nodeId: string) => {
    const isMatched = searchQuery
      ? nodeId.toLowerCase().includes(searchQuery.toLowerCase())
      : false

    let isRelated = false
    let isDirect = false

    if (selectedNode) {
      if (selectedNode.id === nodeId) {
        isDirect = true
      } else {
        // Check if there is an edge connecting selectedNode and current node
        const hasEdge = edges.some(
          edge =>
            (edge.source === selectedNode.id && edge.target === nodeId) ||
            (edge.target === selectedNode.id && edge.source === nodeId)
        )
        if (hasEdge) {
          isRelated = true
        }
      }
    }

    return { isMatched, isRelated, isDirect }
  }

  // Node styles configuration based on type
  const getNodeColor = (type: string) => {
    switch (type) {
      case "Actor":
        return { bg: "#EF4444", border: "#B91C1C", text: "#FEE2E2", label: "Threat Actor" }
      case "Campaign":
        return { bg: "#F59E0B", border: "#D97706", text: "#FEF3C7", label: "Campaign" }
      case "Malware":
        return { bg: "#EC4899", border: "#BE185D", text: "#FCE7F3", label: "Malware Family" }
      case "Domain":
        return { bg: "#3B82F6", border: "#1D4ED8", text: "#DBEAFE", label: "C2 Domain" }
      case "IP":
        return { bg: "#06B6D4", border: "#0E7490", text: "#CFFAFE", label: "C2 IP Address" }
      case "Hash":
      case "Wallet":
        return { bg: "#8B5CF6", border: "#6D28D9", text: "#EDE9FE", label: "Financial/Binary IOC" }
      case "Sector":
        return { bg: "#10B981", border: "#047857", text: "#D1FAE5", label: "Target Sector" }
      default:
        return { bg: "#94A3B8", border: "#475569", text: "#F1F5F9", label: "Intel Node" }
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[720px] w-full" ref={containerRef}>
      {/* Graph Display Area */}
      <div className="lg:col-span-3 bg-card border border-border rounded-lg relative overflow-hidden flex flex-col shadow-glow-blue">
        {/* Controls Overlay */}
        <div className="absolute top-4 left-4 z-10 flex flex-col md:flex-row gap-2 items-start md:items-center w-[calc(100%-2rem)]">
          {/* Search Bar */}
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-foreground/40" />
            <input
              type="text"
              placeholder="Search threat actors, IPs, C2s..."
              className="pl-9 pr-4 py-2 w-full text-xs bg-background/90 border border-border/80 rounded-md focus:outline-none focus:ring-1 focus:ring-accent-blue/80 text-foreground"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          {/* Zoom Controls */}
          <div className="flex bg-background/90 border border-border/80 rounded-md p-1 items-center gap-1 shadow-md">
            <button
              onClick={handleZoomIn}
              className="p-1 hover:bg-card-hover rounded cursor-pointer text-foreground/75"
              title="Zoom In"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-1 hover:bg-card-hover rounded cursor-pointer text-foreground/75"
              title="Zoom Out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <div className="h-4 w-px bg-border mx-1" />
            <button
              onClick={handleReset}
              className="p-1 hover:bg-card-hover rounded cursor-pointer text-foreground/75 flex items-center gap-1 text-[10px]"
              title="Reset View"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset</span>
            </button>
          </div>
          <div className="text-[10px] text-foreground/50 hidden md:block">
            * Drag nodes to adjust; Drag background to pan
          </div>
        </div>

        {/* Dynamic Interactive SVG Canvas */}
        <svg
          ref={svgRef}
          className="w-full h-full cursor-grab active:cursor-grabbing select-none bg-[#080E1A]"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Define SVG filters for neon glowing effect */}
          <defs>
            <filter id="glow-blue" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Root group containing zoom and pan transformations */}
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* Draw Relationships Edges First */}
            {edges.map((edge) => {
              const sourceNode = nodes.find(n => n.id === edge.source)
              const targetNode = nodes.find(n => n.id === edge.target)
              if (!sourceNode || !targetNode) return null

              const { isMatched: sM, isRelated: sR, isDirect: sD } = getHighlightDetails(edge.source)
              const { isMatched: tM, isRelated: tR, isDirect: tD } = getHighlightDetails(edge.target)

              // Edge highlight configuration
              const isHighlighted = (sD && tR) || (tD && sR) || (sM && tM)
              const isDimmed = selectedNode && !isHighlighted
              
              // Edge styling
              const strokeColor = isHighlighted ? "#2563EB" : "#1E293B"
              const strokeWidth = isHighlighted ? 2.5 : 1.2
              const dashArray = edge.label === "COMMUNICATES_WITH" || edge.label === "RESOLVES_TO" ? "5,5" : "none"

              return (
                <g key={edge.id} className="transition-opacity duration-200" opacity={isDimmed ? 0.25 : 1}>
                  <line
                    x1={sourceNode.x}
                    y1={sourceNode.y}
                    x2={targetNode.x}
                    y2={targetNode.y}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray={dashArray}
                  />
                  {/* Edges label text on hover/highlight */}
                  {isHighlighted && (
                    <text
                      x={(sourceNode.x + targetNode.x) / 2}
                      y={(sourceNode.y + targetNode.y) / 2 - 4}
                      fill="#3B82F6"
                      fontSize="9"
                      fontWeight="bold"
                      textAnchor="middle"
                      className="bg-background px-1"
                    >
                      {edge.label}
                    </text>
                  )}
                </g>
              )
            })}

            {/* Draw Nodes */}
            {nodes.map((node) => {
              const { bg, border, text, label } = getNodeColor(node.type)
              const { isMatched, isRelated, isDirect } = getHighlightDetails(node.id)

              const isDimmed = selectedNode && !isDirect && !isRelated
              const radius = node.type === "Actor" ? 28 : node.type === "Campaign" ? 24 : 18
              
              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onMouseDown={(e) => handleNodeMouseDown(e, node)}
                  className="cursor-pointer group transition-opacity duration-200"
                  opacity={isDimmed ? 0.35 : 1}
                >
                  {/* Glowing selection circle */}
                  {(isDirect || isMatched) && (
                    <circle
                      r={radius + 8}
                      fill="none"
                      stroke="#2563EB"
                      strokeWidth="2"
                      className="animate-pulse-ring"
                    />
                  )}
                  {/* Node Base Circle */}
                  <circle
                    r={radius}
                    fill={isDirect ? "#1E293B" : bg}
                    stroke={isDirect ? "#2563EB" : border}
                    strokeWidth={isDirect || isMatched ? 3 : 1.5}
                    filter={isDirect || isMatched ? "url(#glow-blue)" : "none"}
                  />
                  {/* Monospace type letter in center */}
                  <text
                    dy="4"
                    fill={isDirect ? "#3B82F6" : text}
                    fontSize={radius * 0.5}
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {node.type.slice(0, 1)}
                  </text>
                  {/* Label Text below node */}
                  <text
                    y={radius + 15}
                    fill="#F8FAFC"
                    fontSize="9.5"
                    fontWeight={isDirect ? "bold" : "normal"}
                    textAnchor="middle"
                    className="select-none pointer-events-none drop-shadow-md"
                  >
                    {node.label}
                  </text>
                </g>
              )
            })}
          </g>
        </svg>

        {/* Legend block bottom right */}
        <div className="absolute bottom-4 left-4 bg-background/90 border border-border/80 rounded p-2 text-[9px] flex flex-wrap gap-x-4 gap-y-1 max-w-xs shadow-md">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
            <span className="text-foreground/75">Actor</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
            <span className="text-foreground/75">Campaign</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#EC4899]" />
            <span className="text-foreground/75">Malware</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]" />
            <span className="text-foreground/75">Domain</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#06B6D4]" />
            <span className="text-foreground/75">IP Address</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#8B5CF6]" />
            <span className="text-foreground/75">Hash/Wallet</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
            <span className="text-foreground/75">Victim Sector</span>
          </div>
        </div>
      </div>

      {/* Node Details Sidebar Panel */}
      <div className="bg-card border border-border rounded-lg p-5 flex flex-col justify-between shadow-glow-blue">
        {selectedNode ? (
          <div className="flex flex-col h-full justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
                <span className="text-[10px] font-semibold tracking-wider text-accent-blue uppercase bg-accent-blue/10 px-2 py-0.5 rounded">
                  {getNodeColor(selectedNode.type).label}
                </span>
                <span className="text-[10px] text-foreground/50">
                  ID: {selectedNode.id.substring(0, 12)}
                </span>
              </div>

              <div>
                <h4 className="text-lg font-bold text-foreground leading-tight">
                  {selectedNode.label}
                </h4>
                <p className="text-xs text-foreground/45 mt-0.5">
                  Type: {selectedNode.type}
                </p>
              </div>

              {selectedNode.riskScore && (
                <div className="bg-[#0B1220]/60 p-2.5 border border-border/40 rounded flex justify-between items-center">
                  <span className="text-xs text-foreground/60">Risk Intelligence Score:</span>
                  <span className={`text-sm font-bold ${
                    selectedNode.riskScore >= 90 ? "text-accent-rose" :
                    selectedNode.riskScore >= 75 ? "text-accent-amber" : "text-accent-emerald"
                  }`}>
                    {selectedNode.riskScore} / 100
                  </span>
                </div>
              )}

              <div className="space-y-2">
                <h5 className="text-xs font-bold text-foreground/70 uppercase tracking-wider flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 text-accent-blue" />
                  <span>Intelligence Summary</span>
                </h5>
                <p className="text-xs text-foreground/80 leading-relaxed bg-[#0B1220]/40 p-3 rounded border border-border/20">
                  {selectedNode.type === "Actor" && "Russian GRU/North Korean associated threat profile. Operates highly customized modules utilizing zero-days and spearphishing lures. Monitored closely for national security interests."}
                  {selectedNode.type === "Campaign" && "Ongoing active cyber operations targeted at defense contracting, transportation hubs, or POS endpoints. Main goals include system exfiltration and credentials theft."}
                  {selectedNode.type.toLowerCase() === "domain" && "Command and Control server registration associated with active campaign. High reputational alerts for resolving spearphishing shell attachments."}
                  {selectedNode.type.toLowerCase() === "ip" && "C2 Hosting IP. Active traffic streams logging payload sync relays. Recommend blocking egress traffic to this subnet."}
                  {selectedNode.type === "Malware" && "Modular RAT or Wiper payload family. Used for data stealing, keystroke tracking, or wiping critical files. Evades security tools via packing."}
                  {selectedNode.type === "Sector" && "Primary strategic target. Organizations in this vertical should deploy custom indicators and monitor network boundaries."}
                  {selectedNode.type === "Wallet" && "Cryptocurrency transfer address. Utilized in laundered chains to process bitcoin payouts from ransomware operations."}
                  {selectedNode.type === "Hash" && "Payload binary hash signature. Blocks executables at host level across end-user platforms."}
                </p>
              </div>

              <div className="space-y-2">
                <h5 className="text-xs font-bold text-foreground/70 uppercase tracking-wider">
                  Linked Relations ({edges.filter(e => e.source === selectedNode.id || e.target === selectedNode.id).length})
                </h5>
                <div className="max-h-[220px] overflow-y-auto space-y-1.5 pr-1">
                  {edges
                    .filter(e => e.source === selectedNode.id || e.target === selectedNode.id)
                    .map((edge, idx) => {
                      const relatedId = edge.source === selectedNode.id ? edge.target : edge.source
                      const relatedNode = nodes.find(n => n.id === relatedId)
                      return (
                        <div
                          key={idx}
                          onClick={() => relatedNode && setSelectedNode(relatedNode)}
                          className="flex items-center justify-between p-2 text-xs bg-card-hover hover:bg-card border border-border/30 hover:border-accent-blue/30 rounded cursor-pointer transition-colors"
                        >
                          <span className="font-semibold text-foreground/95 truncate max-w-[120px]">
                            {relatedNode?.label || relatedId}
                          </span>
                          <span className="text-[9px] uppercase tracking-wider text-accent-blue font-bold">
                            {edge.label}
                          </span>
                        </div>
                      )
                    })}
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedNode(null)}
              className="mt-4 w-full py-2 bg-[#0B1220] border border-border hover:border-accent-blue text-xs text-foreground/75 hover:text-white rounded cursor-pointer transition-all"
            >
              Clear Selection
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center py-10 space-y-3">
            <div className="p-3 bg-card-hover border border-border rounded-full shadow-inner animate-pulse">
              <Shield className="h-7 w-7 text-accent-blue" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">
                Intelligence Inspector
              </h4>
              <p className="text-xs text-foreground/50 max-w-[180px] mt-1 mx-auto">
                Click on any node in the correlation graph to view linked relationships and detailed telemetry logs.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
