import { useState, useEffect } from 'react'
import { Text, View, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import useRoundStore from '../../store/roundStore'

export default function Stats() {
    const [selectedPeriod, setSelectedPeriod] = useState('all')
    const { roundHistory, loading, getRoundHistory } = useRoundStore()

    useEffect(() => {
        loadRoundHistory()
    }, [])

    const loadRoundHistory = async () => {
        try {
            await getRoundHistory(50, 0) // Load more rounds for better stats
        } catch (error) {
            Alert.alert('Error', 'Failed to load round history: ' + error.message)
        }
    }

    const getScoreText = (relativeScore) => {
        if (relativeScore === 0) return 'Even'
        if (relativeScore > 0) return `+${relativeScore}`
        return `${relativeScore}`
    }

    // Calculate stats from actual round data
    const calculateStats = () => {
        if (roundHistory.length === 0) {
            return {
                roundsPlayed: 0,
                averageEfficiency: 0,
                bestScore: null,
                averageScore: 0,
                totalShots: 0,
                totalPar: 0
            }
        }

        const completedRounds = roundHistory.filter(r => r.is_completed && r.total_shots && r.total_par)
        
        if (completedRounds.length === 0) {
            return {
                roundsPlayed: roundHistory.length,
                averageEfficiency: 0,
                bestScore: null,
                averageScore: 0,
                totalShots: 0,
                totalPar: 0
            }
        }

        const totalShots = completedRounds.reduce((sum, r) => sum + r.total_shots, 0)
        const totalPar = completedRounds.reduce((sum, r) => sum + r.total_par, 0)
        const averageEfficiency = Math.round((totalShots / totalPar * 100))
        const averageScore = Math.round(totalShots / completedRounds.length)
        
        const bestScore = completedRounds.reduce((best, r) => 
            r.score_relative_to_par < best ? r.score_relative_to_par : best, 
            Infinity
        )

        return {
            roundsPlayed: roundHistory.length,
            averageEfficiency,
            bestScore: bestScore === Infinity ? null : bestScore,
            averageScore,
            totalShots,
            totalPar
        }
    }

    const stats = calculateStats()

    const StatCard = ({ title, value, subtitle, icon, color = "green" }) => (
        <View className="bg-white rounded-2xl p-4 shadow-sm flex-1 mx-1">
            <View className="flex-row items-center justify-between mb-2">
                <View className={`w-10 h-10 bg-${color}-100 rounded-full items-center justify-center`}>
                    <Ionicons name={icon} size={20} color={color === "green" ? "#059669" : "#DC2626"} />
                </View>
            </View>
            <Text className="text-2xl font-bold text-gray-900">{value}</Text>
            <Text className="text-gray-600 text-sm">{title}</Text>
            {subtitle && (
                <Text className="text-gray-400 text-xs mt-1">{subtitle}</Text>
            )}
        </View>
    )

    const PeriodButton = ({ period, label }) => (
        <TouchableOpacity
            onPress={() => setSelectedPeriod(period)}
            className={`px-4 py-2 rounded-full ${
                selectedPeriod === period 
                    ? 'bg-green-600' 
                    : 'bg-gray-100'
            }`}
        >
            <Text className={`font-semibold ${
                selectedPeriod === period 
                    ? 'text-white' 
                    : 'text-gray-600'
            }`}>
                {label}
            </Text>
        </TouchableOpacity>
    )

    if (loading && roundHistory.length === 0) {
        return (
            <SafeAreaView className="flex-1 bg-green-50 justify-center items-center" edges={['top']}>
                <ActivityIndicator size="large" color="#059669" />
                <Text className="text-green-900 mt-4 text-lg">Loading your stats...</Text>
            </SafeAreaView>
        )
    }

    return (
        <SafeAreaView className="flex-1 bg-green-50" edges={['top']}>
            <ScrollView className="flex-1">
                {/* Header */}
                <View className="px-6 pt-4 pb-6">
                    <Text className="text-3xl font-bold text-green-900 mb-2">
                        Your Stats
                    </Text>
                    <Text className="text-green-700">
                        Track your golf performance over time
                    </Text>
                </View>

                {/* Period Selector */}
                <View className="px-6 mb-6">
                    <View className="flex-row space-x-2">
                        <PeriodButton period="week" label="Week" />
                        <PeriodButton period="month" label="Month" />
                        <PeriodButton period="year" label="Year" />
                        <PeriodButton period="all" label="All Time" />
                    </View>
                </View>

                {/* Golf Stats Summary */}
                <View className="px-6 mb-6">
                    <Text className="text-xl font-bold text-green-900 mb-4">
                        Your Golf Stats
                    </Text>
                    <View className="grid grid-cols-3 gap-4">
                        <View className="bg-white rounded-2xl p-4 shadow-sm items-center">
                            <Text className="text-2xl font-bold text-green-600">
                                {stats.roundsPlayed}
                            </Text>
                            <Text className="text-gray-600 text-sm text-center">
                                Rounds Played
                            </Text>
                        </View>
                        
                        <View className="bg-white rounded-2xl p-4 shadow-sm items-center">
                            <Text className="text-2xl font-bold text-blue-600">
                                {stats.averageEfficiency}%
                            </Text>
                            <Text className="text-gray-600 text-sm text-center">
                                Avg Efficiency
                            </Text>
                        </View>
                        
                        <View className="bg-white rounded-2xl p-4 shadow-sm items-center">
                            <Text className="text-2xl font-bold text-orange-600">
                                {stats.bestScore !== null ? getScoreText(stats.bestScore) : '-'}
                            </Text>
                            <Text className="text-gray-600 text-sm text-center">
                                Best Score
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Score Overview */}
                <View className="px-6 mb-6">
                    <Text className="text-xl font-bold text-green-900 mb-4">
                        Score Overview
                    </Text>
                    <View className="flex-row space-x-2">
                        <StatCard
                            title="Average Score"
                            value={stats.averageScore || '-'}
                            subtitle={stats.roundsPlayed > 0 ? `${stats.roundsPlayed} rounds` : 'No rounds yet'}
                            icon="golf"
                        />
                        <StatCard
                            title="Best Score"
                            value={stats.bestScore !== null ? getScoreText(stats.bestScore) : '-'}
                            subtitle="Personal best"
                            icon="trophy"
                        />
                    </View>
                </View>

                {/* Performance Metrics */}
                {stats.roundsPlayed > 0 && (
                    <View className="px-6 mb-6">
                        <Text className="text-xl font-bold text-green-900 mb-4">
                            Performance Metrics
                        </Text>
                        
                        <View className="space-y-4">
                            {/* Total Shots vs Par */}
                            <View className="bg-white rounded-2xl p-4 shadow-sm">
                                <View className="flex-row items-center justify-between">
                                    <View className="flex-row items-center">
                                        <View className="w-10 h-10 bg-green-100 rounded-full items-center justify-center mr-3">
                                            <Ionicons name="golf" size={20} color="#059669" />
                                        </View>
                                        <View>
                                            <Text className="text-lg font-semibold text-gray-900">
                                                Total Shots
                                            </Text>
                                            <Text className="text-gray-600 text-sm">
                                                All rounds combined
                                            </Text>
                                        </View>
                                    </View>
                                    <Text className="text-2xl font-bold text-green-600">
                                        {stats.totalShots}
                                    </Text>
                                </View>
                            </View>

                            {/* Total Par */}
                            <View className="bg-white rounded-2xl p-4 shadow-sm">
                                <View className="flex-row items-center justify-between">
                                    <View className="flex-row items-center">
                                        <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center mr-3">
                                            <Ionicons name="flag" size={20} color="#3B82F6" />
                                        </View>
                                        <View>
                                            <Text className="text-lg font-semibold text-gray-900">
                                                Total Par
                                            </Text>
                                            <Text className="text-gray-600 text-sm">
                                                All rounds combined
                                            </Text>
                                        </View>
                                    </View>
                                    <Text className="text-2xl font-bold text-blue-600">
                                        {stats.totalPar}
                                    </Text>
                                </View>
                            </View>

                            {/* Efficiency Rating */}
                            <View className="bg-white rounded-2xl p-4 shadow-sm">
                                <View className="flex-row items-center justify-between mb-3">
                                    <View className="flex-row items-center">
                                        <View className="w-10 h-10 bg-orange-100 rounded-full items-center justify-center mr-3">
                                            <Ionicons name="analytics" size={20} color="#F59E0B" />
                                        </View>
                                        <View>
                                            <Text className="text-lg font-semibold text-gray-900">
                                                Efficiency Rating
                                            </Text>
                                            <Text className="text-gray-600 text-sm">
                                                Shots vs Par percentage
                                            </Text>
                                        </View>
                                    </View>
                                    <Text className="text-2xl font-bold text-orange-600">
                                        {stats.averageEfficiency}%
                                    </Text>
                                </View>
                                <View className="bg-gray-200 rounded-full h-2">
                                    <View 
                                        className="bg-orange-500 h-2 rounded-full" 
                                        style={{ width: `${Math.min(stats.averageEfficiency, 200) / 2}%` }}
                                    />
                                </View>
                                <Text className="text-gray-500 text-xs mt-2">
                                    {stats.averageEfficiency < 100 ? 'Under par average' : 
                                     stats.averageEfficiency === 100 ? 'Par average' : 'Over par average'}
                                </Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Recent Rounds */}
                <View className="px-6 mb-6">
                    <Text className="text-xl font-bold text-green-900 mb-4">
                        Recent Rounds
                    </Text>
                    
                    {roundHistory.length === 0 ? (
                        <View className="bg-white rounded-2xl p-4 shadow-sm">
                            <View className="items-center py-8">
                                <Ionicons name="golf-outline" size={48} color="#9CA3AF" />
                                <Text className="text-gray-500 mt-2 text-center">
                                    No rounds recorded yet
                                </Text>
                                <Text className="text-gray-400 text-sm text-center mt-1">
                                    Start tracking your rounds to see detailed stats
                                </Text>
                            </View>
                        </View>
                    ) : (
                        <View className="space-y-3">
                            {roundHistory.slice(0, 5).map((round) => (
                                <View key={round.id} className="bg-white rounded-2xl p-4 shadow-sm">
                                    <View className="flex-row items-center justify-between">
                                        <View className="flex-1">
                                            <Text className="text-lg font-semibold text-gray-900">
                                                {round.course_name}
                                            </Text>
                                            <Text className="text-gray-600 text-sm mt-1">
                                                {new Date(round.start_time).toLocaleDateString('en-US', {
                                                    weekday: 'short',
                                                    month: 'short',
                                                    day: 'numeric'
                                                })} • {round.total_holes} holes
                                            </Text>
                                        </View>
                                        <View className="items-end">
                                            <Text className={`text-xl font-bold ${
                                                round.score_relative_to_par === 0 ? 'text-green-600' :
                                                round.score_relative_to_par < 0 ? 'text-blue-600' : 'text-red-600'
                                            }`}>
                                                {getScoreText(round.score_relative_to_par || 0)}
                                            </Text>
                                            <Text className="text-gray-500 text-sm">
                                                {round.total_shots || 0} shots
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            ))}
                            
                            {roundHistory.length > 5 && (
                                <TouchableOpacity 
                                    onPress={() => {
                                        // Navigate to round history - you might want to add navigation here
                                        Alert.alert('Info', 'Navigate to Round History to see all rounds')
                                    }}
                                    className="bg-green-100 rounded-2xl p-3 mt-2"
                                >
                                    <Text className="text-green-700 text-center font-medium">
                                        View All {roundHistory.length} Rounds
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    )
}
