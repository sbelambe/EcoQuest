export type ItemType = "trash" | "recycle" | "compost";

export interface UserStats {
  level: number;
  points: number;
  streak: number;
  itemsCollected: number;
  rank: number;
  city: string;
}

export interface Pet {
  name: string;
  type: "raccoon" | "turtle" | "fox";
  stage: number;
  mood: "happy" | "neutral" | "sad";
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  points: number;
  city: string;
  avatar?: string;
}

export interface ScanHistory {
  id: string;
  type: ItemType;
  points: number;
  timestamp: Date;
  location: string;
}

// Mock user data
export const mockUserStats: UserStats = {
  level: 12,
  points: 3480,
  streak: 7,
  itemsCollected: 145,
  rank: 23,
  city: "San Francisco",
};

export const mockPet: Pet = {
  name: "Eco",
  type: "raccoon",
  stage: 2,
  mood: "happy",
};

export const mockLeaderboard: LeaderboardEntry[] = [
  { rank: 1, name: "EcoWarrior", points: 8920, city: "San Francisco" },
  { rank: 2, name: "GreenHero", points: 7850, city: "San Francisco" },
  { rank: 3, name: "RecycleKing", points: 6730, city: "Oakland" },
  { rank: 4, name: "EarthSaver", points: 5890, city: "San Francisco" },
  { rank: 5, name: "TrashPanda", points: 5120, city: "Berkeley" },
  { rank: 6, name: "CompostQueen", points: 4890, city: "San Francisco" },
  { rank: 7, name: "PlasticSlayer", points: 4560, city: "Oakland" },
  { rank: 8, name: "GreenThumb", points: 4230, city: "San Jose" },
  { rank: 9, name: "ZeroWaste", points: 3980, city: "San Francisco" },
  { rank: 10, name: "NatureLover", points: 3850, city: "Berkeley" },
];

export const mockCityLeaderboard = [
  { rank: 1, city: "San Francisco", points: 45680, itemsCollected: 2340 },
  { rank: 2, city: "Oakland", points: 38920, itemsCollected: 1980 },
  { rank: 3, city: "Berkeley", points: 32150, itemsCollected: 1650 },
  { rank: 4, city: "San Jose", points: 28760, itemsCollected: 1420 },
];

export const mockScanHistory: ScanHistory[] = [
  {
    id: "1",
    type: "recycle",
    points: 15,
    timestamp: new Date(2026, 1, 14, 10, 30),
    location: "Mission District",
  },
  {
    id: "2",
    type: "compost",
    points: 20,
    timestamp: new Date(2026, 1, 14, 9, 15),
    location: "Golden Gate Park",
  },
  {
    id: "3",
    type: "trash",
    points: 10,
    timestamp: new Date(2026, 1, 13, 16, 45),
    location: "Fisherman's Wharf",
  },
];

export const nearbyCleanupActivity = [
  { lat: 37.7749, lng: -122.4194, points: 50, user: "GreenHero" },
  { lat: 37.7849, lng: -122.4094, points: 30, user: "EcoWarrior" },
  { lat: 37.7649, lng: -122.4294, points: 25, user: "RecycleKing" },
];

export const tierInfo = [
  { name: "Seedling", minPoints: 0, maxPoints: 999, color: "#90EE90" },
  { name: "Sprout", minPoints: 1000, maxPoints: 2999, color: "#7CFC00" },
  { name: "Guardian", minPoints: 3000, maxPoints: 6999, color: "#32CD32" },
  { name: "Earth Champion", minPoints: 7000, maxPoints: Infinity, color: "#228B22" },
];

export function getCurrentTier(points: number) {
  return tierInfo.find(tier => points >= tier.minPoints && points <= tier.maxPoints) || tierInfo[0];
}

export function getPointsForItemType(type: ItemType): number {
  switch (type) {
    case "compost":
      return 20;
    case "recycle":
      return 15;
    case "trash":
      return 10;
  }
}