import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { NetworkDevice, NetworkSubnet } from '../../lib/types';

// ─── Layout constants ─────────────────────────────────────────

const MARGIN = { top: 30, right: 20, bottom: 20, left: 20 };
const DEVICE_RADIUS = 6;
const SUBNET_PADDING = 40;

// ─── Color map (cyberpunk palette) ───────────────────────────

const typeColors: Record<string, string> = {
  workstation: '#06b6d4',
  server: '#22c55e',
  laptop: '#a78bfa',
  mobile: '#f59e0b',
  tablet: '#8b5cf6',
  router: '#ef4444',
  printer: '#ec4899',
  switch: '#f97316',
  iot: '#14b8a6',
  storage: '#3b82f6',
  unknown: '#6b7280',
};

const severityColors: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
  safe: '#06b6d4',
};

// ─── Props ────────────────────────────────────────────────────

interface NetworkTopologyProps {
  devices: NetworkDevice[];
  subnets: NetworkSubnet[];
  onDeviceClick?: (device: NetworkDevice) => void;
  selectedDeviceId?: string | null;
}

// ─── Component ────────────────────────────────────────────────

export default function NetworkTopology({
  devices,
  subnets,
  onDeviceClick,
  selectedDeviceId,
}: NetworkTopologyProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    device: NetworkDevice;
  } | null>(null);

  // ── Responsive sizing ─────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        const height = Math.max(450, Math.min(700, width * 0.6));
        setDimensions({ width, height });
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // ── Build D3 graph ────────────────────────────────────
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height } = dimensions;
    const innerW = width - MARGIN.left - MARGIN.right;
    const innerH = height - MARGIN.top - MARGIN.bottom;

    const g = svg
      .append('g')
      .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

    // ── Data preparation ────────────────────────────────
    const subnetMap = new Map<string, { label: string; devices: NetworkDevice[] }>();
    subnets.forEach((s) => {
      subnetMap.set(s.cidr, { label: s.label, devices: [] });
    });
    devices.forEach((d) => {
      if (!subnetMap.has(d.subnet)) {
        subnetMap.set(d.subnet, { label: d.subnet, devices: [] });
      }
      subnetMap.get(d.subnet)!.devices.push(d);
    });

    const subnetKeys = Array.from(subnetMap.keys());
    const gridCols = Math.ceil(Math.sqrt(subnetKeys.length));
    const gridRows = Math.ceil(subnetKeys.length / gridCols);
    const cellW = innerW / gridCols;
    const cellH = innerH / gridRows;

    // Place subnet regions in a grid layout
    const subnetRegions = subnetKeys.map((cidr, idx) => {
      const col = idx % gridCols;
      const row = Math.floor(idx / gridCols);
      const cx = cellW * col + cellW / 2;
      const cy = cellH * row + cellH / 2;
      const devCount = subnetMap.get(cidr)!.devices.length;
      // Size based on device count
      const size = Math.max(120, Math.min(200, 80 + devCount * 12));
      return { cidr, cx, cy, size, ...subnetMap.get(cidr)! };
    });

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // ── Subnet background regions ───────────────────────
    subnetRegions.forEach((region) => {
      const isSelected = region.devices.some((d) => d.id === selectedDeviceId);

      const subnetGroup = g
        .append('g')
        .attr('class', 'subnet-group')
        .attr('transform', `translate(${region.cx - region.size / 2},${region.cy - region.size / 2})`);

      // Background rect
      subnetGroup
        .append('rect')
        .attr('width', region.size)
        .attr('height', region.size)
        .attr('rx', 12)
        .attr('fill', isSelected ? 'rgba(6,182,212,0.08)' : 'rgba(31,31,31,0.6)')
        .attr('stroke', isSelected ? 'rgba(6,182,212,0.4)' : 'rgba(31,31,31,1)')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '4,3')
        .attr('class', 'subnet-bg');

      // Subnet label
      subnetGroup
        .append('text')
        .attr('x', region.size / 2)
        .attr('y', 16)
        .attr('text-anchor', 'middle')
        .attr('fill', '#6b7280')
        .attr('font-size', '10px')
        .attr('font-family', 'JetBrains Mono, monospace')
        .text(region.label);

      // CIDR label
      subnetGroup
        .append('text')
        .attr('x', region.size / 2)
        .attr('y', 30)
        .attr('text-anchor', 'middle')
        .attr('fill', '#4b5563')
        .attr('font-size', '9px')
        .attr('font-family', 'JetBrains Mono, monospace')
        .text(region.cidr);

      // Device count badge
      subnetGroup
        .append('text')
        .attr('x', region.size / 2)
        .attr('y', region.size - 8)
        .attr('text-anchor', 'middle')
        .attr('fill', '#9ca3af')
        .attr('font-size', '9px')
        .attr('font-family', 'JetBrains Mono, monospace')
        .text(`${region.devices.length} devices`);
    });

    // ── Device nodes (force-layout within subnet region) ─
    subnetRegions.forEach((region) => {
      const nodes = region.devices;

      // Position nodes within the subnet region using a mini force simulation
      const simulation = d3.forceSimulation(nodes.map((d) => ({ id: d.id, device: d })))
        .force('center', d3.forceCenter(region.cx, region.cy))
        .force('charge', d3.forceManyBody().strength(-60))
        .force('collision', d3.forceCollide(DEVICE_RADIUS + 4))
        .alpha(0.5)
        .alphaDecay(0.08);

      simulation.nodes().forEach((node: any, i) => {
        // Push nodes away from edges
        const pad = SUBNET_PADDING;
        const halfSize = region.size / 2 - pad;
        node.x = Math.max(region.cx - halfSize, Math.min(region.cx + halfSize, (node.x ?? region.cx)));
        node.y = Math.max(region.cy - halfSize, Math.min(region.cy + halfSize, (node.y ?? region.cy)));
      });

      // Run simulation ticks synchronously
      for (let i = 0; i < 60; i++) simulation.tick();
      simulation.stop();

      // Draw nodes
      nodes.forEach((device, idx) => {
        const nodeData: any = simulation.nodes()[idx];
        if (!nodeData) return;

        const isSelected = device.id === selectedDeviceId;
        const isAtRisk = device.riskLevel === 'critical' || device.riskLevel === 'high';
        const deviceColor = typeColors[device.type] ?? '#6b7280';

        const nodeGroup = g
          .append('g')
          .attr('class', 'device-node')
          .attr('transform', `translate(${nodeData.x},${nodeData.y})`)
          .style('cursor', 'pointer')
          .on('click', (event: MouseEvent) => {
            event.stopPropagation();
            onDeviceClick?.(device);
          })
          .on('mouseenter', (event: MouseEvent) => {
            const rect = svgRef.current!.getBoundingClientRect();
            setTooltip({
              x: event.clientX - rect.left + 12,
              y: event.clientY - rect.top - 8,
              device,
            });
          })
          .on('mouseleave', () => setTooltip(null));

        // Glow circle
        if (isAtRisk) {
          nodeGroup
            .append('circle')
            .attr('r', DEVICE_RADIUS + 4)
            .attr('fill', 'none')
            .attr('stroke', severityColors[device.riskLevel])
            .attr('stroke-width', 1.5)
            .attr('stroke-opacity', 0.4);
        }

        if (isSelected) {
          nodeGroup
            .append('circle')
            .attr('r', DEVICE_RADIUS + 6)
            .attr('fill', 'none')
            .attr('stroke', '#06b6d4')
            .attr('stroke-width', 2)
            .attr('stroke-opacity', 0.7)
            .attr('stroke-dasharray', '3,2');
        }

        // Main device circle
        nodeGroup
          .append('circle')
          .attr('r', DEVICE_RADIUS)
          .attr('fill', deviceColor)
          .attr('fill-opacity', device.status === 'offline' ? 0.3 : 0.85)
          .attr('stroke', deviceColor)
          .attr('stroke-width', device.status === 'offline' ? 1 : 0);

        // Status indicator dot
        if (device.status === 'online') {
          nodeGroup
            .append('circle')
            .attr('r', 2)
            .attr('cx', DEVICE_RADIUS + 3)
            .attr('cy', -DEVICE_RADIUS - 1)
            .attr('fill', '#22c55e');
        } else if (device.status === 'error') {
          nodeGroup
            .append('circle')
            .attr('r', 2)
            .attr('cx', DEVICE_RADIUS + 3)
            .attr('cy', -DEVICE_RADIUS - 1)
            .attr('fill', '#ef4444');
        }

        // Device label
        nodeGroup
          .append('text')
          .attr('x', 0)
          .attr('y', DEVICE_RADIUS + 12)
          .attr('text-anchor', 'middle')
          .attr('fill', '#d1d5db')
          .attr('font-size', '8px')
          .attr('font-family', 'JetBrains Mono, monospace')
          .text(device.hostname.length > 14 ? device.hostname.slice(0, 12) + '…' : device.hostname);
      });
    });

    // ── Legend ───────────────────────────────────────────
    const legendTypes = Object.entries(typeColors).filter(([key]) =>
      devices.some((d) => d.type === key),
    );
    const legendG = g
      .append('g')
      .attr('transform', `translate(${innerW - 160}, ${innerH - legendTypes.length * 18 - 10})`);

    legendG
      .append('rect')
      .attr('width', 155)
      .attr('height', legendTypes.length * 18 + 12)
      .attr('rx', 6)
      .attr('fill', 'rgba(0,0,0,0.75)')
      .attr('stroke', 'rgba(31,31,31,1)')
      .attr('stroke-width', 1);

    legendTypes.forEach(([type, color], i) => {
      const ly = 8 + i * 18 + 8;
      legendG
        .append('circle')
        .attr('cx', 10)
        .attr('cy', ly)
        .attr('r', 4)
        .attr('fill', color)
        .attr('fill-opacity', 0.85);

      legendG
        .append('text')
        .attr('x', 20)
        .attr('y', ly + 1.5)
        .attr('fill', '#9ca3af')
        .attr('font-size', '9px')
        .attr('font-family', 'JetBrains Mono, monospace')
        .text(type.charAt(0).toUpperCase() + type.slice(1));

      // Online indicator
      if (i === 0) {
        legendG
          .append('circle')
          .attr('cx', 140)
          .attr('cy', ly)
          .attr('r', 2)
          .attr('fill', '#22c55e');
        legendG
          .append('text')
          .attr('x', 146)
          .attr('y', ly + 1.5)
          .attr('fill', '#6b7280')
          .attr('font-size', '7px')
          .attr('font-family', 'JetBrains Mono, monospace')
          .text('online');
      }
    });

    return () => {
      svg.on('.zoom', null);
    };
  }, [devices, subnets, dimensions, selectedDeviceId, onDeviceClick]);

  return (
    <div ref={containerRef} className="relative w-full rounded-xl bg-muted/30 border border-border overflow-hidden">
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="w-full"
        style={{ display: 'block' }}
      />

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute z-50 pointer-events-none"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <div className="bg-background/95 border border-border rounded-lg px-3 py-2 shadow-xl backdrop-blur-sm min-w-[160px]">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: typeColors[tooltip.device.type] ?? '#6b7280' }}
              />
              <span className="text-xs font-bold text-foreground font-heading">{tooltip.device.hostname}</span>
            </div>
            <div className="space-y-0.5 text-[10px] font-mono text-muted-foreground">
              <p>{tooltip.device.ip}</p>
              <p>{tooltip.device.type} &middot; {tooltip.device.os}</p>
              <p className="flex items-center gap-1">
                Risk: <span style={{ color: severityColors[tooltip.device.riskLevel] }}>{tooltip.device.riskLevel}</span>
                <span className="ml-1 text-[9px]">{tooltip.device.openPorts} ports</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
