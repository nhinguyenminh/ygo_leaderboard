'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { getAllPlayers, createMatch, updatePlayer, recalculateRankings } from '@/lib/firebaseService';
import { calculateElo, getKFactor, getTierFromElo } from '@/lib/utils';
import { Player, MatchType } from '@/types';
import { ArrowLeft, Swords, User, Trophy, Save } from 'lucide-react';
import Link from 'next/link';

export default function AddMatchPage() {
    return (
        <ProtectedRoute>
            <AddMatchForm />
        </ProtectedRoute>
    );
}

function AddMatchForm() {
    const [players, setPlayers] = useState<Player[]>([]);
    const [formData, setFormData] = useState({
        player1Id: '',
        player2Id: '',
        winnerId: '',
        winnerScore: 2,
        loserScore: 0
    });
    const [loading, setLoading] = useState(false);
    const [loadingPlayers, setLoadingPlayers] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const router = useRouter();

    useEffect(() => {
        loadPlayers();
    }, []);

    const loadPlayers = async () => {
        try {
            const playersData = await getAllPlayers();
            setPlayers(playersData);
        } catch (error) {
            console.error('Error loading players:', error);
            setError('Failed to load players');
        } finally {
            setLoadingPlayers(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.player1Id || !formData.player2Id || !formData.winnerId) {
            setError('Please fill in all required fields');
            return;
        }

        if (formData.player1Id === formData.player2Id) {
            setError('Player 1 and Player 2 must be different');
            return;
        }

        if (formData.winnerId !== formData.player1Id && formData.winnerId !== formData.player2Id) {
            setError('Winner must be either Player 1 or Player 2');
            return;
        }

        try {
            setError('');
            setLoading(true);

            const player1 = players.find(p => p.id === formData.player1Id)!;
            const player2 = players.find(p => p.id === formData.player2Id)!;
            const winner = formData.winnerId === formData.player1Id ? player1 : player2;
            const loser = formData.winnerId === formData.player1Id ? player2 : player1;

            // Calculate new ELOs with bonuses
            const kFactor = Math.max(getKFactor(winner.elo, winner.totalMatches), getKFactor(loser.elo, loser.totalMatches));
            const eloResult = calculateElo(
                winner.elo,
                loser.elo,
                kFactor,
                formData.winnerScore,
                formData.loserScore,

                Math.max(0, winner.streak), // winner streak
                Math.max(0, loser.streak),  // loser streak

                winner.rank,
                loser.rank,

                winner.totalMatches,
                loser.totalMatches
            );

            // Create match record
            const matchData = {
                player1Id: formData.player1Id,
                player2Id: formData.player2Id,
                player1Name: player1.name,
                player2Name: player2.name,
                player1Deck: player1.mainDeck || player1.decks.find(d => d.isMain)?.archetypeName || 'Unknown',
                player2Deck: player2.mainDeck || player2.decks.find(d => d.isMain)?.archetypeName || 'Unknown',
                winnerId: formData.winnerId,
                winnerScore: formData.winnerId === formData.player1Id ? formData.winnerScore : formData.loserScore,
                loserScore: formData.winnerId === formData.player1Id ? formData.loserScore : formData.winnerScore,
                loserElo: loser.elo,
                winnerElo: winner.elo,
                eloChange: eloResult.eloChange,
                dominantWinBonus: eloResult.dominantWinBonus || 0,
                streakBonus: eloResult.streakBonus || 0,
                bountyBonus: eloResult.bountyBonus || 0,
                date: new Date(),
                duration: 30,
                matchType: MatchType.RANKED
            };

            await createMatch(matchData);

            // Update winner
            const newWinnerWins = winner.wins + 1;
            const newWinnerTotal = winner.totalMatches + 1;
            const newWinnerWinRate = Math.round((newWinnerWins / newWinnerTotal) * 100);
            const newWinnerStreak = winner.streak >= 0 ? winner.streak + 1 : 1;

            await updatePlayer(winner.id, {
                elo: eloResult.newWinnerElo,
                tier: getTierFromElo(eloResult.newWinnerElo),
                wins: newWinnerWins,
                totalMatches: newWinnerTotal,
                winRate: newWinnerWinRate,
                streak: newWinnerStreak,
                peakElo: Math.max(winner.peakElo, eloResult.newWinnerElo)
            });

            // Update loser
            const newLoserLosses = loser.losses + 1;
            const newLoserTotal = loser.totalMatches + 1;
            const newLoserWinRate = Math.round((loser.wins / newLoserTotal) * 100);
            const newLoserStreak = loser.streak <= 0 ? loser.streak - 1 : -1;

            await updatePlayer(loser.id, {
                elo: eloResult.newLoserElo,
                tier: getTierFromElo(eloResult.newLoserElo),
                losses: newLoserLosses,
                totalMatches: newLoserTotal,
                winRate: newLoserWinRate,
                streak: newLoserStreak
            });

            // Recalculate all player rankings after match
            await recalculateRankings();

            setSuccess(true);

            // Reset form
            setFormData({
                player1Id: '',
                player2Id: '',
                winnerId: '',
                winnerScore: 2,
                loserScore: 0
            });

            // Redirect after success
            setTimeout(() => {
                router.push('/');
            }, 2000);

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to record match';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: (name === 'winnerScore' || name === 'loserScore') ? parseInt(value) || 0 : value
        }));
    };

    const getPlayerName = (playerId: string) => {
        const player = players.find(p => p.id === playerId);
        return player ? `${player.name} (${player.elo} YP)` : '';
    };

    if (loadingPlayers) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-slate-400">Loading players...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-50" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
            }} />

            <div className="relative z-10">
                {/* Header */}
                <header className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
                    <div className="mx-auto max-w-4xl px-6 py-6">
                        <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                            <ArrowLeft className="h-4 w-4" />
                            Back to Leaderboard
                        </Link>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-4xl px-6 py-8">
                    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8">
                        <div className="mb-8">
                            <h1 className="text-3xl font-bold text-white mb-2">Record Match Result</h1>
                            <p className="text-slate-400">Update the leaderboard with a new match result</p>
                        </div>

                        {/* Success Message */}
                        {success && (
                            <div className="mb-6 p-4 rounded-lg border border-green-500/50 bg-green-500/10">
                                <p className="text-green-400">Match recorded successfully! ELO updated. Redirecting...</p>
                            </div>
                        )}

                        {/* Error Message */}
                        {error && (
                            <div className="mb-6 p-4 rounded-lg border border-red-500/50 bg-red-500/10">
                                <p className="text-red-400">{error}</p>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Player 1 */}
                            <div>
                                <label htmlFor="player1Id" className="block text-sm font-medium text-slate-300 mb-2">
                                    Player 1 *
                                </label>
                                <div className="relative">
                                    <User className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                                    <select
                                        id="player1Id"
                                        name="player1Id"
                                        value={formData.player1Id}
                                        onChange={handleInputChange}
                                        className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        disabled={loading}
                                        required
                                    >
                                        <option value="">Select Player 1</option>
                                        {players.map(player => (
                                            <option key={player.id} value={player.id}>
                                                {player.name} ({player.elo} YP) - {player.mainDeck || player.decks.find(d => d.isMain)?.archetypeName || 'Unknown'}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Player 2 */}
                            <div>
                                <label htmlFor="player2Id" className="block text-sm font-medium text-slate-300 mb-2">
                                    Player 2 *
                                </label>
                                <div className="relative">
                                    <User className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                                    <select
                                        id="player2Id"
                                        name="player2Id"
                                        value={formData.player2Id}
                                        onChange={handleInputChange}
                                        className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        disabled={loading}
                                        required
                                    >
                                        <option value="">Select Player 2</option>
                                        {players.map(player => (
                                            <option key={player.id} value={player.id}>
                                                {player.name} ({player.elo} YP) - {player.mainDeck || player.decks.find(d => d.isMain)?.archetypeName || 'Unknown'}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Winner */}
                            <div>
                                <label htmlFor="winnerId" className="block text-sm font-medium text-slate-300 mb-2">
                                    Winner *
                                </label>
                                <div className="relative">
                                    <Trophy className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                                    <select
                                        id="winnerId"
                                        name="winnerId"
                                        value={formData.winnerId}
                                        onChange={handleInputChange}
                                        className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        disabled={loading || !formData.player1Id || !formData.player2Id}
                                        required
                                    >
                                        <option value="">Select Winner</option>
                                        {formData.player1Id && (
                                            <option value={formData.player1Id}>
                                                {getPlayerName(formData.player1Id)}
                                            </option>
                                        )}
                                        {formData.player2Id && (
                                            <option value={formData.player2Id}>
                                                {getPlayerName(formData.player2Id)}
                                            </option>
                                        )}
                                    </select>
                                </div>
                            </div>

                            {/* Match Score */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="winnerScore" className="block text-sm font-medium text-slate-300 mb-2">
                                        Winner Score *
                                    </label>
                                    <div className="relative">
                                        <Trophy className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                                        <select
                                            id="winnerScore"
                                            name="winnerScore"
                                            value={formData.winnerScore}
                                            onChange={handleInputChange}
                                            className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                            disabled={loading}
                                            required
                                        >
                                            <option value={2}>2</option>
                                            <option value={1}>1</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="loserScore" className="block text-sm font-medium text-slate-300 mb-2">
                                        Loser Score *
                                    </label>
                                    <div className="relative">
                                        <Swords className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                                        <select
                                            id="loserScore"
                                            name="loserScore"
                                            value={formData.loserScore}
                                            onChange={handleInputChange}
                                            className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                            disabled={loading}
                                            required
                                        >
                                            <option value={0}>0</option>
                                            <option value={1}>1</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={loading}
                            >
                                <Save className="h-5 w-5" />
                                {loading ? 'Recording Match...' : 'Record Match'}
                            </button>
                        </form>
                    </div>
                </main>
            </div>
        </div>
    );
} 
