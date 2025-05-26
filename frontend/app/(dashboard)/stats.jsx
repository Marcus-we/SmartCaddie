import { useState, useEffect } from 'react'
import { Text, View, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Dimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Link } from 'expo-router'
import useRoundStore from '../../store/roundStore'

// Simple custom chart component
const SimpleLineChart = ({ data, labels, width, height }) => {
    if (!data || data.length === 0) return null
    
    const maxValue = Math.max(...data.map(d => Math.abs(d)))
    const minValue = Math.min(...data)
    const range = maxValue - minValue || 1
    const chartHeight = height - 80 // Leave space for labels
    
    const points = data.map((value, index) => {
        const x = data.length === 1 ? (width - 40) / 2 + 20 : (index / (data.length - 1)) * (width - 40) + 20
        const y = chartHeight - ((value - minValue) / range) * chartHeight + 30
        return { x, y, value }
    })
    
    return (
        <View style={{ width, height, position: 'relative' }}>
            {/* Background grid lines */}
            <View style={{ position: 'absolute', top: 30, left: 20, right: 20, bottom: 50 }}>
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => (
                    <View
                        key={index}
                        style={{
                            position: 'absolute',
                            top: ratio * chartHeight,
                            left: 0,
                            right: 0,
                            height: 1,
                            backgroundColor: '#e5e7eb',
                        }}
                    />
                ))}
            </View>
            
            {/* Data line */}
            <View style={{ position: 'absolute', top: 0, left: 0 }}>
                {points.slice(1).map((point, index) => {
                    const prevPoint = points[index]
                    const distance = Math.sqrt(
                        Math.pow(point.x - prevPoint.x, 2) + Math.pow(point.y - prevPoint.y, 2)
                    )
                    const angle = Math.atan2(point.y - prevPoint.y, point.x - prevPoint.x) * 180 / Math.PI
                    
                    return (
                        <View
                            key={index}
                            style={{
                                position: 'absolute',
                                left: prevPoint.x,
                                top: prevPoint.y,
                                width: distance,
                                height: 3,
                                backgroundColor: '#059669',
                                transformOrigin: '0 50%',
                                transform: [{ rotate: `${angle}deg` }],
                            }}
                        />
                    )
                })}
            </View>
            
            {/* Data points */}
            {points.map((point, index) => (
                <View
                    key={index}
                    style={{
                        position: 'absolute',
                        left: point.x - 6,
                        top: point.y - 6,
                        width: 12,
                        height: 12,
                        borderRadius: 6,
                        backgroundColor: '#059669',
                        borderWidth: 2,
                        borderColor: '#ffffff',
                    }}
                />
            ))}
            
            {/* Y-axis labels */}
            <View style={{ position: 'absolute', left: 0, top: 30, bottom: 50 }}>
                {[maxValue, Math.round((maxValue + minValue) / 2), minValue].map((value, index) => (
                    <Text
                        key={index}
                        style={{
                            position: 'absolute',
                            top: index * (chartHeight / 2) - 8,
                            fontSize: 12,
                            color: '#6b7280',
                            textAlign: 'right',
                            width: 15,
                        }}
                    >
                        {value > 0 ? `+${value}` : value}
                    </Text>
                ))}
            </View>
            
            {/* X-axis labels */}
            <View style={{ position: 'absolute', bottom: 10, left: 20, right: 20 }}>
                {labels && points.map((point, index) => (
                    <Text
                        key={index}
                        style={{
                            position: 'absolute',
                            left: point.x - 20,
                            fontSize: 12,
                            color: '#6b7280',
                            textAlign: 'center',
                            width: 40,
                        }}
                    >
                        {labels[index]}
                    </Text>
                ))}
            </View>
        </View>
    )
}

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

    // Filter rounds by selected time period
    const filterRoundsByPeriod = (rounds, period) => {
        if (period === 'all') return rounds
        
        const now = new Date()
        const cutoffDate = new Date()
        
        switch (period) {
            case 'week':
                cutoffDate.setDate(now.getDate() - 7)
                break
            case 'month':
                cutoffDate.setMonth(now.getMonth() - 1)
                break
            case 'year':
                cutoffDate.setFullYear(now.getFullYear() - 1)
                break
            default:
                return rounds
        }
        
        return rounds.filter(round => new Date(round.start_time) >= cutoffDate)
    }

    // Calculate stats from actual round data
    const calculateStats = () => {
        // Filter rounds by selected period
        const filteredRounds = filterRoundsByPeriod(roundHistory, selectedPeriod)
        
        if (filteredRounds.length === 0) {
            return {
                roundsPlayed: 0,
                averageEfficiency: 0,
                bestScore: null,
                bestShots9: null,
                bestShots18: null,
                averageScore9: 0,
                averageScore18: 0,
                rounds9: 0,
                rounds18: 0,
                totalShots: 0,
                totalPar: 0
            }
        }

        const completedRounds = filteredRounds.filter(r => r.is_completed && r.total_shots && r.total_par)
        
        if (completedRounds.length === 0) {
            return {
                roundsPlayed: filteredRounds.length,
                averageEfficiency: 0,
                bestScore: null,
                bestShots9: null,
                bestShots18: null,
                averageScore9: 0,
                averageScore18: 0,
                rounds9: 0,
                rounds18: 0,
                totalShots: 0,
                totalPar: 0
            }
        }

        // Separate rounds by hole count
        const rounds9 = completedRounds.filter(r => r.total_holes === 9)
        const rounds18 = completedRounds.filter(r => r.total_holes === 18)

        const totalShots = completedRounds.reduce((sum, r) => sum + r.total_shots, 0)
        const totalPar = completedRounds.reduce((sum, r) => sum + r.total_par, 0)
        const averageEfficiency = Math.round((totalShots / totalPar * 100))
        
        // Calculate separate averages for 9 and 18 hole rounds
        const averageScore9 = rounds9.length > 0 ? 
            Math.round(rounds9.reduce((sum, r) => sum + r.total_shots, 0) / rounds9.length) : 0
        const averageScore18 = rounds18.length > 0 ? 
            Math.round(rounds18.reduce((sum, r) => sum + r.total_shots, 0) / rounds18.length) : 0
        
        const bestScore = completedRounds.reduce((best, r) => 
            r.score_relative_to_par < best ? r.score_relative_to_par : best, 
            Infinity
        )

        // Find best total shots for 9-hole and 18-hole separately
        const bestShots9 = rounds9.length > 0 ? 
            rounds9.reduce((best, r) => r.total_shots < best ? r.total_shots : best, Infinity) : null
        const bestShots18 = rounds18.length > 0 ? 
            rounds18.reduce((best, r) => r.total_shots < best ? r.total_shots : best, Infinity) : null

        return {
            roundsPlayed: filteredRounds.length,
            averageEfficiency,
            bestScore: bestScore === Infinity ? null : bestScore,
            bestShots9: bestShots9 === Infinity ? null : bestShots9,
            bestShots18: bestShots18 === Infinity ? null : bestShots18,
            averageScore9,
            averageScore18,
            rounds9: rounds9.length,
            rounds18: rounds18.length,
            totalShots,
            totalPar
        }
    }

    const stats = calculateStats()

    // Prepare data for the score over time chart
    const prepareChartData = () => {
        // Filter rounds by selected period first
        const filteredRounds = filterRoundsByPeriod(roundHistory, selectedPeriod)
        
        if (filteredRounds.length === 0) return null
        
        // Filter completed rounds and sort by date
        const completedRounds = filteredRounds
            .filter(r => r.is_completed && r.score_relative_to_par !== null)
            .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
            .slice(-10) // Show last 10 rounds within the period
        
        if (completedRounds.length === 0) return null
        
        // If only one round, show it as a single point
        if (completedRounds.length === 1) {
            const round = completedRounds[0]
            const date = new Date(round.start_time)
            return {
                labels: [`${date.getMonth() + 1}/${date.getDate()}`],
                datasets: [{
                    data: [round.score_relative_to_par],
                    color: (opacity = 1) => `rgba(5, 150, 105, ${opacity})`,
                    strokeWidth: 3
                }]
            }
        }
        
        const labels = completedRounds.map((round, index) => {
            const date = new Date(round.start_time)
            // Show month/day for recent rounds, or just round number if many rounds
            if (completedRounds.length <= 5) {
                return `${date.getMonth() + 1}/${date.getDate()}`
            } else {
                return `R${index + 1}`
            }
        })
        
        const data = completedRounds.map(round => round.score_relative_to_par)
        
        return {
            labels,
            datasets: [{
                data,
                color: (opacity = 1) => `rgba(5, 150, 105, ${opacity})`,
                strokeWidth: 3
            }]
        }
    }

    const chartData = prepareChartData()
    const screenWidth = Dimensions.get('window').width

    // Get filtered rounds for recent rounds section
    const getFilteredRecentRounds = () => {
        const filteredRounds = filterRoundsByPeriod(roundHistory, selectedPeriod)
        return filteredRounds.slice(0, 5)
    }

    const filteredRecentRounds = getFilteredRecentRounds()

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
                        Your Golf Stats {selectedPeriod !== 'all' ? `(${selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)})` : ''}
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
                    <View className="gap-3">
                        {/* Average Scores by Hole Count */}
                        <View className="flex-row gap-2">
                            <StatCard
                                title="Avg 9-Hole Score"
                                value={stats.averageScore9 || '-'}
                                subtitle={stats.rounds9 > 0 ? `${stats.rounds9} rounds` : 'No 9-hole rounds'}
                                icon="golf"
                            />
                            <StatCard
                                title="Avg 18-Hole Score"
                                value={stats.averageScore18 || '-'}
                                subtitle={stats.rounds18 > 0 ? `${stats.rounds18} rounds` : 'No 18-hole rounds'}
                                icon="golf"
                            />
                        </View>
                        
                        {/* Best Scores */}
                        <View className="flex-row gap-2">
                            <StatCard
                                title="Best Relative Score"
                                value={stats.bestScore !== null ? getScoreText(stats.bestScore) : '-'}
                                // subtitle="Best score relative to par"
                                icon="trophy"
                            />
                            <View className="bg-white rounded-2xl p-4 shadow-sm flex-1 mx-1">
                                <View className="flex-row items-center justify-between mb-2">
                                    <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center">
                                        <Ionicons name="golf" size={20} color="#3B82F6" />
                                    </View>
                                </View>
                                <View className="flex-row gap-2">
                                    <Text className="text-lg font-bold text-gray-900">
                                        {stats.bestShots9 ? `${stats.bestShots9} (9H)` : '-'}
                                    </Text>
                                    <Text className="text-lg font-bold text-gray-900">
                                        |
                                    </Text>
                                    <Text className="text-lg font-bold text-gray-900">
                                        {stats.bestShots18 ? `${stats.bestShots18} (18H)` : '-'}
                                    </Text>
                                </View>
                                <Text className="text-gray-600 text-sm">Best Total Shots</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Performance Metrics */}
                {stats.roundsPlayed > 0 && (
                    <View className="px-6 mb-6">
                        <Text className="text-xl font-bold text-green-900 mb-4">
                            Performance Metrics
                        </Text>
                        
                        <View className="gap-3">
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

                {/* Score Over Time */}
                <View className="px-6 mb-6">
                    <Text className="text-xl font-bold text-green-900 mb-4">
                        Score Over Time
                    </Text>
                    {chartData ? (
                        <View className="bg-white rounded-2xl p-4 shadow-sm">
                            <SimpleLineChart
                                data={chartData.datasets[0].data}
                                labels={chartData.labels}
                                width={screenWidth - 80}
                                height={220}
                            />
                            <Text className="text-gray-600 text-sm text-center mt-2">
                                Score relative to par over your last {chartData.labels.length} rounds
                                {selectedPeriod !== 'all' ? ` (${selectedPeriod})` : ''}
                            </Text>
                        </View>
                    ) : (
                        <View className="bg-white rounded-2xl p-4 shadow-sm">
                            <View className="items-center py-8">
                                <Ionicons name="analytics-outline" size={48} color="#9CA3AF" />
                                <Text className="text-gray-500 mt-2 text-center">
                                    No completed rounds yet
                                </Text>
                                <Text className="text-gray-400 text-sm text-center mt-1">
                                    Complete some rounds to see your score progression
                                </Text>
                            </View>
                        </View>
                    )}
                </View>

                {/* Recent Rounds */}
                <View className="px-6 mb-6">
                    <Text className="text-xl font-bold text-green-900 mb-4">
                        Recent Rounds {selectedPeriod !== 'all' ? `(${selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)})` : ''}
                    </Text>
                    
                    {filteredRecentRounds.length === 0 ? (
                        <View className="bg-white rounded-2xl p-4 shadow-sm">
                            <View className="items-center py-8">
                                <Ionicons name="golf-outline" size={48} color="#9CA3AF" />
                                <Text className="text-gray-500 mt-2 text-center">
                                    {selectedPeriod === 'all' ? 'No rounds recorded yet' : `No rounds in the selected ${selectedPeriod}`}
                                </Text>
                                <Text className="text-gray-400 text-sm text-center mt-1">
                                    {selectedPeriod === 'all' ? 'Start tracking your rounds to see detailed stats' : 'Try selecting a different time period or record more rounds'}
                                </Text>
                            </View>
                        </View>
                    ) : (
                        <View className="gap-3">
                            {filteredRecentRounds.map((round) => (
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
                            
                            {filterRoundsByPeriod(roundHistory, selectedPeriod).length > 5 && (
                                <Link href="/(dashboard)/round-history" asChild>
                                    <TouchableOpacity className="bg-green-100 rounded-2xl p-3 mt-2">
                                        <Text className="text-green-700 text-center font-medium">
                                            View All {filterRoundsByPeriod(roundHistory, selectedPeriod).length} Rounds
                                        </Text>
                                    </TouchableOpacity>
                                </Link>
                            )}
                        </View>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    )
}
