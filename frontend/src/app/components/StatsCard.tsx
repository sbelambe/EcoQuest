import { motion } from "motion/react";

interface StatsCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color?: string;
}

export function StatsCard({ icon, label, value, color = "green" }: StatsCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className="bg-white rounded-xl p-4 shadow-md flex items-center gap-3"
    >
      <div className={`w-12 h-12 rounded-full bg-${color}-100 flex items-center justify-center text-${color}-600`}>
        {icon}
      </div>
      <div className="flex-1">
        <div className="text-gray-500 text-sm">{label}</div>
        <div className="text-2xl font-bold text-gray-800">{value}</div>
      </div>
    </motion.div>
  );
}
