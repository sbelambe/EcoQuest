import { motion } from "motion/react";
import { TrendingUp, Settings, Share2, LogOut, Flame, Trophy, MapPin, Calendar } from "lucide-react";
import { BottomNav } from "../components/BottomNav";
import { PetAvatar } from "../components/PetAvatar";
import { mockUserStats, mockScanHistory, getCurrentTier, mockPet } from "../data/mockData";

export function Profile() {
  const currentTier = getCurrentTier(mockUserStats.points);
  const topSafeOffset = "calc(env(safe-area-inset-top, 0px) + 12px)";

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-blue-50 pb-20">
      {/* Header */}
      <div
        className="bg-gradient-to-r from-green-600 to-green-500 text-white p-6 rounded-b-3xl shadow-lg"
        style={{ paddingTop: topSafeOffset }}
      >
        <div className="flex items-center gap-4 mb-6">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-4xl">
            🦝
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">EcoWarrior23</h1>
            <p className="text-green-100 text-sm">Level {mockUserStats.level} • {currentTier.name}</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="px-2 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs">
                {mockUserStats.city}
              </div>
              <div className="px-2 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs">
                {mockUserStats.itemsCollected} items
              </div>
            </div>
          </div>
          <button className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
            <Settings size={20} />
          </button>
        </div>

        {/* Stats overview */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Rank", value: `#${mockUserStats.rank}`, icon: Trophy },
            { label: "Points", value: mockUserStats.points.toLocaleString(), icon: TrendingUp },
            { label: "Streak", value: `${mockUserStats.streak}d`, icon: Flame },
          ].map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center"
              >
                <Icon size={20} className="mx-auto mb-1" />
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="text-xs text-green-100 mt-1">{stat.label}</div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Pet section */}
      <div className="px-6 mt-6">
        <div className="bg-white rounded-2xl p-6 shadow-md">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Your Companion</h2>
          <div className="flex items-center gap-4">
            <PetAvatar pet={mockPet} size="md" animated />
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-gray-800">{mockPet.name}</h3>
              <p className="text-gray-600 capitalize mb-2">{mockPet.type} • Stage {mockPet.stage}</p>
              <p className="text-sm text-gray-600">
                {mockPet.mood === "happy"
                  ? "Your pet is happy! Keep up the great work cleaning up. 😊"
                  : mockPet.mood === "neutral"
                  ? "Your pet is content. Scan more items to make them happier! 😐"
                  : "Your pet misses you! Don't break your streak. 😢"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Stats */}
      <div className="px-6 mt-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Statistics</h2>
        <div className="grid grid-cols-2 gap-3">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-xl p-4 shadow-md"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                <Trophy size={20} className="text-yellow-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-800">#{mockUserStats.rank}</div>
            <div className="text-sm text-gray-600">Global Rank</div>
          </motion.div>

          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl p-4 shadow-md"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <Flame size={20} className="text-orange-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-800">{mockUserStats.streak} days</div>
            <div className="text-sm text-gray-600">Current Streak</div>
          </motion.div>

          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl p-4 shadow-md"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <TrendingUp size={20} className="text-green-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-800">{mockUserStats.points.toLocaleString()}</div>
            <div className="text-sm text-gray-600">Total Points</div>
          </motion.div>

          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl p-4 shadow-md"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <MapPin size={20} className="text-blue-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-800">{mockUserStats.itemsCollected}</div>
            <div className="text-sm text-gray-600">Items Collected</div>
          </motion.div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="px-6 mt-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Calendar size={24} className="text-green-600" />
          Recent Activity
        </h2>

        <div className="space-y-3">
          {mockScanHistory.map((scan, index) => {
            const typeConfig = {
              trash: { icon: "🗑️", color: "gray", label: "Trash" },
              recycle: { icon: "♻️", color: "blue", label: "Recycle" },
              compost: { icon: "🌱", color: "green", label: "Compost" },
            };

            const config = typeConfig[scan.type];

            return (
              <motion.div
                key={scan.id}
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-2xl p-4 shadow-md"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 bg-${config.color}-100 rounded-xl flex items-center justify-center text-2xl`}>
                    {config.icon}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-800">{config.label}</h4>
                    <p className="text-sm text-gray-600">{scan.location}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {scan.timestamp.toLocaleDateString()} at {scan.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-600">+{scan.points}</div>
                    <div className="text-xs text-gray-500">points</div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Impact stats */}
      <div className="px-6 mt-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <TrendingUp size={24} className="text-green-600" />
          Your Impact
        </h2>

        <div className="bg-gradient-to-br from-green-500 to-blue-500 rounded-2xl p-6 text-white shadow-lg">
          <h3 className="text-lg font-bold mb-4">Environmental Contribution</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-green-100">Plastic bottles saved</span>
              <span className="text-xl font-bold">87</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-green-100">CO₂ reduced</span>
              <span className="text-xl font-bold">12.4 kg</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-green-100">Compost created</span>
              <span className="text-xl font-bold">5.2 kg</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-white/20 text-center">
            <p className="text-sm text-green-100">
              That's equivalent to planting <span className="font-bold text-white">8 trees</span> 🌳
            </p>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="px-6 mt-6 pb-6 space-y-3">
        <button className="w-full bg-white rounded-xl p-4 shadow-md flex items-center gap-3 hover:bg-gray-50 transition-colors">
          <Share2 size={20} className="text-green-600" />
          <span className="font-medium text-gray-800">Share Progress</span>
        </button>
        <button className="w-full bg-white rounded-xl p-4 shadow-md flex items-center gap-3 hover:bg-red-50 transition-colors">
          <LogOut size={20} className="text-red-500" />
          <span className="font-medium text-gray-800">Sign Out</span>
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
