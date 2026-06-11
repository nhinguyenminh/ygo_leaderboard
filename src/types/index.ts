export interface PlayerDeck {
  archetypeId: string;
  archetypeName: string;
  isMain: boolean; // Main deck for display
}

export interface Player {
  id: string;
  userId?: string; // Firebase Auth user ID
  name: string;
  avatar: string;
  elo: number;
  rank: number;
  wins: number;
  losses: number;
  winRate: number;
  tier: PlayerTier;
  locals: string[]; // Array of local IDs
  decks: PlayerDeck[]; // Array of player's decks
  mainDeck?: string; // Main deck archetype name for backward compatibility
  totalMatches: number;
  streak: number; // Current win/loss streak
  peakElo: number;
  recentMatches: Match[];
  // Last season statistics
  lastSeasonElo?: number; // ELO from previous season
  lastSeasonPeakElo?: number; // Peak ELO achieved in previous season
  lastSeasonRank?: number; // Final rank from previous season
}

export interface Match {
  id: string;
  player1Id: string;
  player2Id: string;
  player1Name: string;
  player2Name: string;
  player1Deck: string;
  player2Deck: string;
  winnerId: string;
  loserElo: number;
  winnerElo: number;
  eloChange: number;
  dominantWinBonus?: number;
  streakBonus?: number;
  bountyBonus?: number;
  date: Date;
}

export interface MatchHistory {
  playerId: string;
  matches: Match[];
  totalMatches: number;
  wins: number;
  losses: number;
  winRate: number;
  averageMatchDuration: number;
}

export enum PlayerTier {
  WOOD = 'wood',
  IRON = 'iron',
  BRONZE = 'bronze',
  SILVER = 'silver',
  GOLD = 'gold',
  PLATINUM = 'platinum',
  EMERALD = 'emerald',
  DIAMOND = 'diamond',
  MASTER = 'master',
  GRANDMASTER = 'grandmaster',
  CHALLENGER = 'challenger'
}

export enum MatchType {
  RANKED = 'ranked',
  CASUAL = 'casual',
  TOURNAMENT = 'tournament'
}

export interface LeaderboardStats {
  totalPlayers: number;
  averageElo: number;
  topPlayerElo: number;
  totalMatches: number;
  mostPlayedDeck: string;
}

export interface EloCalculation {
  newWinnerElo: number;
  newLoserElo: number;
  eloChange: number;
  dominantWinBonus?: number;
  streakBonus?: number;
  bountyBonus?: number;
}

export interface Local {
  id: string;
  name: string;
  location: string;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface DeckArchetype {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string; // Archetype image URL
  bossMonsterImageUrl?: string; // Boss monster image for background
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Snapshot {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  totalPlayers: number;
  players: Player[]; // Full player data at the time of snapshot
  metadata?: {
    averageElo: number;
    topPlayerElo: number;
    totalMatches: number;
    mostPlayedDeck: string;
  };
}

export interface SeasonConfig {
  seasonNumber: number;
  seasonName: string;
  startDate: Date;
  endDate?: Date;
  resetElo?: number;
  resetTier?: PlayerTier;
  preservePeakElo?: boolean;
} 
