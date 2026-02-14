import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Trophy, Users, MapPin, TrendingUp, Medal } from "lucide-react";
import { BottomNav } from "../components/BottomNav";
import { mockLeaderboard, mockCityLeaderboard, mockUserStats } from "../data/mockData";

export function Leaderboard() {
  const [selectedTab, setSelectedTab] = useState<"global" | "city">("global");

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-blue-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white p-6 rounded-b-3xl shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <Trophy size={32} />
          <div>
            <h1 className="text-3xl font-bold">Leaderboard</h1>
            <p className="text-yellow-100 text-sm">Compete with eco-warriors</p>
          </div>
        </div>

        {/* User rank card */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-white/20 backdrop-blur-sm rounded-2xl p-4"
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
              <span className="text-3xl">🦝</span>
            </div>
            <div className="flex-1">
              <div className="text-sm text-yellow-100">Your Rank</div>
              <div className="text-2xl font-bold">#{mockUserStats.rank}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-yellow-100">Points</div>
              <div className="text-2xl font-bold">{mockUserStats.points.toLocaleString()}</div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="px-6 mt-6">
        <div className="bg-white rounded-2xl p-2 flex gap-2 shadow-md">
          <button
            onClick={() => setSelectedTab("global")}
            className={`flex-1 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
              selectedTab === "global"
                ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Users size={18} />
            Players
          </button>
          <button
            onClick={() => setSelectedTab("city")}
            className={`flex-1 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
              selectedTab === "city"
                ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <MapPin size={18} />
            Cities
          </button>
        </div>
      </div>

      {/* Weekly challenge banner */}
      <div className="px-6 mt-6">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-6 text-white"
        >
          <div className="flex items-center gap-3 mb-3">
            <TrendingUp size={28} />
            <div>
              <h3 className="font-bold text-lg">Weekly Challenge</h3>
              <p className="text-sm text-white/80">Top 3 win exclusive badges!</p>
            </div>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
            <div className="text-sm mb-1">Challenge Progress</div>
            <div className="bg-white/30 rounded-full h-3 mb-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "67%" }}
                transition={{ duration: 1, delay: 0.3 }}
                className="bg-white h-3 rounded-full"
              />
            </div>
            <div className="text-xs text-white/90">67/100 items collected this week</div>
          </div>
        </motion.div>
      </div>

      {/* Leaderboard content */}
      <AnimatePresence mode="wait">
        {selectedTab === "global" ? (
          <motion.div
            key="global"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="px-6 mt-6 pb-6"
          >
            <h3 className="font-bold text-gray-800 mb-4">Top Players</h3>
            <div className="space-y-3">
              {mockLeaderboard.map((entry, index) => {
                const isTopThree = entry.rank <= 3;
                const medals = ["🥇", "🥈", "🥉"];

                return (
                  <motion.div
                    key={entry.rank}
                    initial={{ x: -50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className={`bg-white rounded-2xl p-4 shadow-md relative overflow-hidden ${
                      entry.rank === mockUserStats.rank ? "ring-2 ring-green-500" : ""
                    }`}
                  >
                    {isTopThree && (
                      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-yellow-200 to-yellow-400 opacity-20 rounded-bl-full" />
                    )}
                    <div className="flex items-center gap-4 relative z-10">
                      <div
                        className={`w-12 h-12 flex items-center justify-center rounded-full font-bold ${
                          isTopThree
                            ? "bg-gradient-to-br from-yellow-400 to-yellow-600 text-white text-2xl"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {isTopThree ? medals[entry.rank - 1] : entry.rank}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-800 truncate flex items-center gap-2">
                          {entry.name}
                          {entry.rank === mockUserStats.rank && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">You</span>
                          )}
                        </h4>
                        <p className="text-sm text-gray-600 flex items-center gap-1">
                          <MapPin size={12} />
                          {entry.city}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-gray-800">{entry.points.toLocaleString()}</div>
                        <div className="text-xs text-gray-500">points</div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="city"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="px-6 mt-6 pb-6"
          >
            <h3 className="font-bold text-gray-800 mb-4">City vs City</h3>
            <div className="space-y-3">
              {mockCityLeaderboard.map((entry, index) => {
                const medals = ["🥇", "🥈", "🥉"];
                const isTopThree = entry.rank <= 3;
                const isUserCity = entry.city === mockUserStats.city;

                return (
                  <motion.div
                    key={entry.city}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className={`bg-white rounded-2xl p-5 shadow-md relative overflow-hidden ${
                      isUserCity ? "ring-2 ring-green-500" : ""
                    }`}
                  >
                    {isTopThree && (
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-200 to-green-200 opacity-20 rounded-bl-full" />
                    )}
                    <div className="flex items-center gap-4 relative z-10">
                      <div
                        className={`w-14 h-14 flex items-center justify-center rounded-full font-bold text-2xl ${
                          isTopThree
                            ? "bg-gradient-to-br from-blue-400 to-green-400 text-white"
                            : "bg-gray-100 text-gray-600 text-xl"
                        }`}
                      >
                        {isTopThree ? medals[entry.rank - 1] : entry.rank}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                          {entry.city}
                          {isUserCity && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Your City</span>
                          )}
                        </h4>
                        <div className="flex items-center gap-4 mt-1">
                          <p className="text-sm text-gray-600">{entry.points.toLocaleString()} points</p>
                          <p className="text-sm text-gray-600">{entry.itemsCollected.toLocaleString()} items</p>
                        </div>
                      </div>
                      <Medal size={28} className={isTopThree ? "text-yellow-500" : "text-gray-300"} />
                    </div>

                    {/* Progress bar */}
                    <div className="mt-3 bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full"
                        style={{ width: `${(entry.points / 50000) * 100}%` }}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Heatmap section */}
            <div className="mt-6 bg-white rounded-2xl p-6 shadow-md">
              <h3 className="font-bold text-gray-800 mb-4">Regional Activity Heatmap</h3>
              <div className="bg-gradient-to-br from-green-100 to-blue-100 rounded-xl h-48 flex items-center justify-center">
                <div className="text-center text-gray-600">
                  <MapPin size={48} className="mx-auto mb-2 text-green-600" />
                  <p className="font-medium">Bay Area Cleanup Activity</p>
                  <p className="text-sm mt-1">San Francisco leading with 45.6k points</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}
