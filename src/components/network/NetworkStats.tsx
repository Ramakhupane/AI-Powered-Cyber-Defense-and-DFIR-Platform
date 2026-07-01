import { Monitor, Wifi, WifiOff, AlertTriangle, Activity, Layers } from 'lucide-react';
import type { NetworkStats } from '../../lib/types';

interface NetworkStatsProps {
  stats: NetworkStats;
}

export default function NetworkStats({ stats }: NetworkStatsProps) {
  const cards = [
    {
      label: 'Total Devices',
      value: stats.totalDevices,
      icon: Monitor,
      color: 'text-primary',
      bg: 'bg-primary/10',
      border: 'border-primary/20',
      glow: 'shadow-[0_0_15px_rgba(6,182,212,0.1)]',
    },
    {
      label: 'Online',
      value: stats.onlineCount,
      icon: Wifi,
      color: 'text-green-500',
      bg: 'bg-green-500/10',
      border: 'border-green-500/20',
      glow: 'shadow-[0_0_15px_rgba(34,197,94,0.1)]',
    },
    {
      label: 'Offline',
      value: stats.offlineCount,
      icon: WifiOff,
      color: 'text-red-400',
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
      glow: 'shadow-[0_0_15px_rgba(239,68,68,0.1)]',
    },
    {
      label: 'At Risk',
      value: stats.atRiskCount,
      icon: AlertTriangle,
      color: 'text-orange-500',
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/20',
      glow: 'shadow-[0_0_15px_rgba(249,115,22,0.1)]',
    },
    {
      label: 'Subnets',
      value: stats.subnets.length,
      icon: Layers,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
      glow: 'shadow-[0_0_15px_rgba(192,132,252,0.1)]',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className={`flex items-center gap-3 p-3 rounded-xl ${card.bg} border ${card.border} ${card.glow} transition-all duration-200`}
          >
            <div className={`w-9 h-9 rounded-lg ${card.bg} border ${card.border} flex items-center justify-center`}>
              <Icon className={`w-4 h-4 ${card.color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground/60 font-medium">{card.label}</p>
              <p className={`text-lg font-bold font-heading tabular-nums ${card.color}`}>{card.value}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}