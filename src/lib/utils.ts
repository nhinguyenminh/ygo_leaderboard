import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Player, PlayerTier, EloCalculation } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ELO calculation system with bonuses
export function calculateElo(
  winnerElo: number,
  loserElo: number,
  kFactor: number = 32,
  winnerScore: number = 2,
  loserScore: number = 0,
  winnerStreak: number = 0,
  loserStreak: number = 0,
  winnerRank: number = 999,
  loserRank: number = 999,
  winnerMatchesPlayed: number = 0,
  loserMatchesPlayed: number = 0
): EloCalculation {

  // Expected scores
  const expectedWinner =
    1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));

  const expectedLoser =
    1 / (1 + Math.pow(10, (winnerElo - loserElo) / 400));

  // Base ELO change
  let baseWinnerChange =
    kFactor * (1 - expectedWinner);

  let baseLoserChange =
    kFactor * (0 - expectedLoser);

  // Placement match multipliers
  if (winnerMatchesPlayed < 5) {
    baseWinnerChange *= 5;
  }

  if (loserMatchesPlayed < 5) {
    baseLoserChange *= 2;
  }

  // Bonus for 2-0 victory
  let dominantWinBonus = 0;

  if (winnerScore === 2 && loserScore === 0) {
    dominantWinBonus =
      Math.round(kFactor * 0.15);
  }

  // Reduced streak bonus
  let streakBonus = 0;

  if (winnerStreak > 0) {
    const streakMultiplier =
      Math.min(winnerStreak, 10) * 0.025;

    streakBonus =
      Math.round(kFactor * streakMultiplier);
  }

  // Bounty system
  let bountyBonus = 0;

  if (loserStreak >= 3) {

    if (loserRank === 1) {

      bountyBonus =
        Math.min(
          9 + loserStreak * 2,
          30
        );

    } else if (loserRank === 2) {

      bountyBonus =
        Math.min(
          4 + loserStreak * 2,
          20
        );

    } else if (loserRank === 3) {

      bountyBonus =
        Math.min(
          loserStreak + 2,
          15
        );

    }

  }

  // Final ELO gain
  const totalWinnerChange =
    Math.round(
      baseWinnerChange +
      dominantWinBonus +
      streakBonus +
      bountyBonus
    );

  const newWinnerElo =
    Math.round(
      winnerElo + totalWinnerChange
    );

  // Loser does NOT lose bounty
  const newLoserElo =
    Math.round(
      loserElo + baseLoserChange
    );

  return {
    newWinnerElo,
    newLoserElo,
    eloChange: totalWinnerChange,
    dominantWinBonus,
    streakBonus,
    bountyBonus
  };
}

// Determine tier based on ELO
export function getTierFromElo(elo: number): PlayerTier {
  if (elo >= 2400) return PlayerTier.CHALLENGER;  // 2400+ YP
  if (elo >= 2200) return PlayerTier.GRANDMASTER; // 2200-2399 YP
  if (elo >= 2000) return PlayerTier.MASTER;      // 2000-2199 YP
  if (elo >= 1800) return PlayerTier.DIAMOND;     // 1800-1999 YP
  if (elo >= 1700) return PlayerTier.EMERALD;     // 1700-1799 YP
  if (elo >= 1600) return PlayerTier.PLATINUM;    // 1600-1699 YP
  if (elo >= 1400) return PlayerTier.GOLD;        // 1400-1599 YP
  if (elo >= 1200) return PlayerTier.SILVER;      // 1200-1399 YP
  if (elo >= 1000) return PlayerTier.BRONZE;      // 1000-1199 YP
  if (elo >= 800) return PlayerTier.IRON;         // 800-999 YP
  return PlayerTier.WOOD;                         // <800 YP
}

// Get tier color
export function getTierColor(tier: PlayerTier): string {
  switch (tier) {
    case PlayerTier.CHALLENGER:
      return "from-red-500 to-orange-500";
    case PlayerTier.GRANDMASTER:
      return "from-purple-500 to-pink-500";
    case PlayerTier.MASTER:
      return "from-blue-500 to-purple-500";
    case PlayerTier.DIAMOND:
      return "from-cyan-500 to-blue-500";
    case PlayerTier.EMERALD:
      return "from-emerald-500 to-green-500";
    case PlayerTier.PLATINUM:
      return "from-green-500 to-cyan-500";
    case PlayerTier.GOLD:
      return "from-yellow-500 to-orange-500";
    case PlayerTier.SILVER:
      return "from-gray-400 to-gray-600";
    case PlayerTier.BRONZE:
      return "from-amber-600 to-amber-800";
    case PlayerTier.IRON:
      return "from-gray-600 to-gray-800";
    case PlayerTier.WOOD:
      return "from-amber-800 to-yellow-900";
    default:
      return "from-gray-400 to-gray-600";
  }
}

// Format win rate as percentage
export function formatWinRate(wins: number, losses: number): string {
  const total = wins + losses;
  if (total === 0) return "0%";
  return `${Math.round((wins / total) * 100)}%`;
}

// Format ELO display
export function formatElo(elo: number): string {
  return `${elo.toLocaleString()}`;
}

// Format match record
export function formatRecord(wins: number, losses: number): string {
  return `${wins}W ${losses}L`;
}

// Calculate K-factor based on player tier and matches played
export function getKFactor(elo: number, matchesPlayed: number): number {
  // New players get higher K-factor for faster rating changes
  if (matchesPlayed < 30) return 40;
  
  // High-rated players get lower K-factor for stability
  if (elo >= 2400) return 16;
  if (elo >= 2100) return 24;
  
  return 32;
}

// Generate random avatar URL (using reliable fallback)
export function generateAvatarUrl(playerId: string): string {
  // Instead of using external URLs that might timeout, use our reliable fallback
  const playerName = `Player ${playerId}`;
  return generateDefaultAvatar(playerName, 150);
}

// Generate a data URL for a default avatar (no external dependencies)
export function generateDefaultAvatar(name: string, size: number = 150): string {
  const initial = name.charAt(0).toUpperCase();
  const colors = [
    '#3B82F6', // blue
    '#8B5CF6', // purple
    '#10B981', // emerald
    '#F59E0B', // amber
    '#EF4444', // red
    '#06B6D4', // cyan
    '#84CC16', // lime
    '#F97316', // orange
  ];
  
  const colorIndex = name.charCodeAt(0) % colors.length;
  const bgColor = colors[colorIndex];
  
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="${bgColor}" rx="${size / 8}"/>
      <text x="50%" y="50%" text-anchor="middle" dy="0.35em" fill="white" font-family="system-ui, -apple-system, sans-serif" font-size="${size * 0.4}" font-weight="600">
        ${initial}
      </text>
    </svg>
  `;
  
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

// Get a reliable fallback avatar
export function getReliableAvatarUrl(avatar: string | undefined, name: string, size: number = 150): string {
  if (avatar && avatar.trim() && !avatar.includes('via.placeholder.com')) {
    return avatar;
  }
  return generateDefaultAvatar(name, size);
}

// Sort players by ELO (descending) and assign ranks
export function rankPlayers(players: Player[]): Player[] {
  return players
    .sort((a, b) => b.elo - a.elo)
    .map((player, index) => ({
      ...player,
      rank: index + 1,
    }));
}

// Get recent match trend (for streak visualization)
export function getMatchTrend(matches: { winnerId: string }[], playerId: string): string[] {
  return matches
    .slice(-10) // Last 10 matches
    .map(match => match.winnerId === playerId ? 'W' : 'L');
} 
