import { useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import type { AttackPath, AttackPathNode, AttackPathEdge, SeverityLevel } from '../../lib/types';

// ─── Node color mapping ──────────────────────────────────────────

const nodeColors: Record<AttackPathNode['type'], string> = {
  internal: '#06b6d4',
  malicious: '#ef4444',
  suspicious: '#eab308',
};

const severityColors: Record<SeverityLevel, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
  safe: '#06b6d4',
};

// ─── Types for the force layout ──────────────────────────────────

interface SimNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  type: AttackPathNode['type'];
  severity?: SeverityLevel;
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  label: string;
}

// ─── Component ───────────────────────────────────────────────────

interface AttackPathGraphProps {
  data: AttackPath;
  width?: number;
  height?: number;
}

export default function AttackPathGraph({ data, width = 400, height = 320 }: AttackPathGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const draw = useCallback(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const containerWidth = containerRef.current?.clientWidth ?? width;

    // Build simulation data
    const nodes: SimNode[] = data.nodes.map((n) => ({
      id: n.id,
      label: n.label,
      type: n.type,
      severity: n.severity,
    }));

    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const links: SimLink[] = data.edges
      .filter((e) => nodeMap.has(e.source) && nodeMap.has(e.target))
      .map((e) => ({
        source: e.source,
        target: e.target,
        label: e.label,
      }));

    // Create the force simulation
    const simulation = d3
      .forceSimulation<SimNode>(nodes)
      .force(
        'link',
        d3.forceLink<SimNode, SimLink>(links).id((d) => d.id).distance(80),
      )
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(containerWidth / 2, height / 2))
      .force('collision', d3.forceCollide(25));

    // Zoom behavior
    const g = svg.append('g');
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });
    svg.call(zoom);

    // Draw links (edges)
    const link = g
      .append('g')
      .selectAll<SVGLineElement, SimLink>('line')
      .data(links)
      .join('line')
      .attr('stroke', '#334155')
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.6);

    // Edge labels
    const linkLabel = g
      .append('g')
      .selectAll<SVGTextElement, SimLink>('text')
      .data(links)
      .join('text')
      .attr('fill', '#64748b')
      .attr('font-size', 8)
      .attr('text-anchor', 'middle')
      .attr('dy', -5)
      .text((d) => d.label);

    // Draw nodes
    const node = g
      .append('g')
      .selectAll<SVGGElement, SimNode>('g')
      .data(nodes)
      .join('g')
      .style('cursor', 'pointer')
      .call(
        d3.drag<SVGGElement, SimNode>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          }),
      );

    // Node circles
    node
      .append('circle')
      .attr('r', 18)
      .attr('fill', (d) => nodeColors[d.type])
      .attr('stroke', (d) => (d.severity ? severityColors[d.severity] : nodeColors[d.type]))
      .attr('stroke-width', 2.5)
      .attr('stroke-opacity', 0.8)
      .style('filter', (d) =>
        d.type === 'malicious'
          ? 'drop-shadow(0 0 4px rgba(239,68,68,0.6))'
          : d.type === 'suspicious'
            ? 'drop-shadow(0 0 4px rgba(234,179,8,0.4))'
            : 'drop-shadow(0 0 3px rgba(6,182,212,0.3))',
      );

    // Node labels
    node
      .append('text')
      .attr('fill', '#f1f5f9')
      .attr('font-size', 8)
      .attr('font-weight', 600)
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .text((d) => d.label.length > 10 ? d.label.slice(0, 10) + '…' : d.label)
      .style('pointer-events', 'none');

    // Hover tooltip effect
    node
      .on('mouseenter', function (event, d) {
        d3.select(this).select('circle').transition().duration(200).attr('r', 22);
        // Highlight connected links
        link
          .attr('stroke-opacity', (l) =>
            (l.source as SimNode).id === d.id || (l.target as SimNode).id === d.id ? 1 : 0.15,
          )
          .attr('stroke-width', (l) =>
            (l.source as SimNode).id === d.id || (l.target as SimNode).id === d.id ? 3 : 1,
          );
        // Dim non-connected nodes
        node
          .attr('opacity', (n) =>
            n.id === d.id ||
            links.some(
              (l) =>
                ((l.source as SimNode).id === n.id && (l.target as SimNode).id === d.id) ||
                ((l.target as SimNode).id === n.id && (l.source as SimNode).id === d.id),
            )
              ? 1
              : 0.3,
          );
      })
      .on('mouseleave', function () {
        d3.select(this).select('circle').transition().duration(200).attr('r', 18);
        link.attr('stroke-opacity', 0.6).attr('stroke-width', 2);
        node.attr('opacity', 1);
      });

    // Simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as SimNode).x ?? 0)
        .attr('y1', (d) => (d.source as SimNode).y ?? 0)
        .attr('x2', (d) => (d.target as SimNode).x ?? 0)
        .attr('y2', (d) => (d.target as SimNode).y ?? 0);

      linkLabel
        .attr('x', (d) => ((d.source as SimNode).x ?? 0 + (d.target as SimNode).x ?? 0) / 2)
        .attr('y', (d) => ((d.source as SimNode).y ?? 0 + (d.target as SimNode).y ?? 0) / 2);

      node.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    return () => {
      simulation.stop();
    };
  }, [data, width, height]);

  useEffect(() => {
    const cleanup = draw();
    return () => cleanup?.();
  }, [draw]);

  return (
    <div ref={containerRef} className="w-full">
      <svg
        ref={svgRef}
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="rounded-lg"
        style={{ background: 'transparent' }}
      />
    </div>
  );
}