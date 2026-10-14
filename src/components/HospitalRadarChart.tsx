import React from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

interface RadarDataPoint {
  subject: string;
  score: number;
  benchmark: number;
  fullMark: number;
}

interface HospitalRadarChartProps {
  data: RadarDataPoint[];
}

export const HospitalRadarChart: React.FC<HospitalRadarChartProps> = ({ data }) => {
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const pData = payload[0].payload;
      return (
        <div className="glass-panel p-3 rounded-xl border border-hospital-accent/40 shadow-glow-md text-xs">
          <p className="font-bold text-white mb-1">{pData.subject}</p>
          <p className="text-hospital-accent font-semibold">
            Patient Score: <span className="text-white">{pData.score}/100</span>
          </p>
          <p className="text-hospital-warm">
            Hospital Target: <span className="text-white">{pData.benchmark}/100</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-72 sm:h-80 flex flex-col items-center justify-center relative">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
          <PolarGrid stroke="#4C131A" strokeDasharray="3 3" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: '#F5E6E8', fontSize: 11, fontWeight: 600 }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 100]}
            tick={{ fill: '#B89B9E', fontSize: 10 }}
            stroke="#3B0E14"
          />
          <Radar
            name="Patient Score"
            dataKey="score"
            stroke="#E63946"
            strokeWidth={2.5}
            fill="#E63946"
            fillOpacity={0.45}
          />
          <Radar
            name="Target Benchmark"
            dataKey="benchmark"
            stroke="#FF6B4A"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            fill="#FF6B4A"
            fillOpacity={0.15}
          />
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex items-center gap-6 mt-1 text-xs text-hospital-textMuted">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-hospital-accent shadow-glow-sm" />
          <span className="text-hospital-textLight font-medium">Recorded Score</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full border-2 border-dashed border-hospital-warm" />
          <span>Hospital Target Benchmark</span>
        </div>
      </div>
    </div>
  );
};
