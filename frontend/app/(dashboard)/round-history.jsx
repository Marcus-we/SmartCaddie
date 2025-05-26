import { useState, useEffect } from 'react'
import { Text, View, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator, Alert, Modal } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import useRoundStore from '../../store/roundStore'

export default function RoundHistory() {
    const [refreshing, setRefreshing] = useState(false)
    const [expandedRounds, setExpandedRounds] = useState(new Set())
    const [selectedRound, setSelectedRound] = useState(null)
    const [showDetailModal, setShowDetailModal] = useState(false)
    
    const { roundHistory, loading, getRoundHistory, getRoundDetails, deleteRound } = useRoundStore()

    useEffect(() => {
        loadRoundHistory()
    }, [])

    const loadRoundHistory = async () => {
        try {
            await getRoundHistory(20, 0) // Load last 20 rounds
        } catch (error) {
            Alert.alert('Error', 'Failed to load round history: ' + error.message)
        }
    }

    const onRefresh = async () => {
        setRefreshing(true)
        await loadRoundHistory()
        setRefreshing(false)
    }

    const toggleRoundExpansion = (roundId) => {
        const newExpanded = new Set(expandedRounds)
        if (newExpanded.has(roundId)) {
            newExpanded.delete(roundId)
        } else {
            newExpanded.add(roundId)
        }
        setExpandedRounds(newExpanded)
    }

    const viewRoundDetails = async (roundId) => {
        try {
            const roundDetails = await getRoundDetails(roundId)
            setSelectedRound(roundDetails)
            setShowDetailModal(true)
        } catch (error) {
            Alert.alert('Error', 'Failed to load round details: ' + error.message)
        }
    }

    const handleDeleteRound = (round) => {
        Alert.alert(
            'Delete Round',
            `Are you sure you want to delete your round at ${round.course_name}? This action cannot be undone.`,
            [
                {
                    text: 'Cancel',
                    style: 'cancel'
                },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteRound(round.id)
                            Alert.alert('Success', 'Round deleted successfully')
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete round: ' + error.message)
                        }
                    }
                }
            ]
        )
    }

    const formatDate = (dateString) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        })
    }

    const formatTime = (dateString) => {
        const date = new Date(dateString)
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const getScoreColor = (relativeScore) => {
        if (relativeScore === 0) return 'text-green-600'
        if (relativeScore < 0) return 'text-blue-600'
        return 'text-red-600'
    }

    const getScoreText = (relativeScore) => {
        if (relativeScore === 0) return 'Even'
        if (relativeScore > 0) return `+${relativeScore}`
        return `${relativeScore}`
    }

    const RoundCard = ({ round }) => {
        const isExpanded = expandedRounds.has(round.id)
        
        return (
            <View className="bg-white rounded-2xl shadow-sm mb-4 overflow-hidden">
                {/* Round Header */}
                <TouchableOpacity
                    onPress={() => toggleRoundExpansion(round.id)}
                    className="p-4"
                >
                    <View className="flex-row items-center justify-between">
                        <View className="flex-1">
                            <Text className="text-lg font-bold text-gray-900">
                                {round.course_name}
                            </Text>
                            <Text className="text-gray-600 text-sm mt-1">
                                {formatDate(round.start_time)} • {round.total_holes} holes
                            </Text>
                            {round.end_time && (
                                <Text className="text-gray-500 text-xs mt-1">
                                    {formatTime(round.start_time)} - {formatTime(round.end_time)}
                                </Text>
                            )}
                        </View>
                        
                        <View className="items-end">
                            <Text className={`text-2xl font-bold ${getScoreColor(round.score_relative_to_par || 0)}`}>
                                {getScoreText(round.score_relative_to_par || 0)}
                            </Text>
                            <Text className="text-gray-600 text-sm">
                                {round.total_shots || 0} shots
                            </Text>
                            <View className="flex-row items-center mt-2">
                                <Text className="text-gray-500 text-xs mr-2">
                                    {round.is_completed ? 'Completed' : 'In Progress'}
                                </Text>
                                <Ionicons 
                                    name={isExpanded ? "chevron-up" : "chevron-down"} 
                                    size={16} 
                                    color="#6B7280" 
                                />
                            </View>
                        </View>
                    </View>
                </TouchableOpacity>

                {/* Expanded Content */}
                {isExpanded && (
                    <View className="border-t border-gray-100 p-4">
                        <View className="flex-row justify-between items-center mb-4">
                            <Text className="text-base font-semibold text-gray-900">
                                Quick Stats
                            </Text>
                            <View className="flex-row space-x-2">
                                <TouchableOpacity
                                    onPress={() => viewRoundDetails(round.id)}
                                    className="bg-green-100 px-3 py-1 rounded-lg"
                                >
                                    <Text className="text-green-700 font-medium text-sm">
                                        View Full Scorecard
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => handleDeleteRound(round)}
                                    className="bg-red-100 px-3 py-1 rounded-lg"
                                >
                                    <Text className="text-red-700 font-medium text-sm">
                                        Delete
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                        
                        <View className="grid grid-cols-2 gap-4">
                            <View className="bg-gray-50 rounded-lg p-3">
                                <Text className="text-gray-600 text-sm">Total Par</Text>
                                <Text className="text-gray-900 font-bold text-lg">
                                    {round.total_par || 0}
                                </Text>
                            </View>
                            
                            <View className="bg-gray-50 rounded-lg p-3">
                                <Text className="text-gray-600 text-sm">Total Shots</Text>
                                <Text className="text-gray-900 font-bold text-lg">
                                    {round.total_shots || 0}
                                </Text>
                            </View>
                        </View>
                        
                        {round.notes && (
                            <View className="mt-4 bg-blue-50 rounded-lg p-3">
                                <Text className="text-blue-900 font-medium text-sm mb-1">
                                    Round Notes
                                </Text>
                                <Text className="text-blue-800 text-sm">
                                    {round.notes}
                                </Text>
                            </View>
                        )}
                    </View>
                )}
            </View>
        )
    }

    if (loading && roundHistory.length === 0) {
        return (
            <SafeAreaView className="flex-1 bg-green-50 justify-center items-center" edges={['top']}>
                <ActivityIndicator size="large" color="#059669" />
                <Text className="text-green-900 mt-4 text-lg">Loading round history...</Text>
            </SafeAreaView>
        )
    }

    return (
        <SafeAreaView className="flex-1 bg-green-50" edges={['top']}>
            {/* Header */}
            <View className="flex-row items-center justify-between p-4 bg-white shadow-sm">
                <TouchableOpacity 
                    onPress={() => router.back()}
                    className="p-2"
                >
                    <Ionicons name="arrow-back" size={24} color="#374151" />
                </TouchableOpacity>
                
                <Text className="text-xl font-bold text-gray-900">Round History</Text>
                
                <TouchableOpacity 
                    onPress={onRefresh}
                    className="p-2"
                >
                    <Ionicons name="refresh" size={24} color="#059669" />
                </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView 
                className="flex-1 p-4"
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {roundHistory.length === 0 ? (
                    <View className="flex-1 justify-center items-center py-20">
                        <Ionicons name="golf-outline" size={64} color="#9CA3AF" />
                        <Text className="text-gray-900 text-xl font-bold mt-4 text-center">
                            No Rounds Yet
                        </Text>
                        <Text className="text-gray-600 mt-2 text-center px-8">
                            Start playing some rounds to see your history here!
                        </Text>
                        <TouchableOpacity 
                            onPress={() => router.push('/(dashboard)/start-round')}
                            className="bg-green-600 rounded-2xl px-6 py-3 mt-6"
                        >
                            <Text className="text-white font-bold">Start Your First Round</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <>


                        {/* Rounds List */}
                        <Text className="text-lg font-bold text-gray-900 mb-4">
                            Recent Rounds
                        </Text>
                        
                        {roundHistory.map((round) => (
                            <RoundCard key={round.id} round={round} />
                        ))}
                        
                        {roundHistory.length >= 20 && (
                            <TouchableOpacity 
                                onPress={() => Alert.alert('Coming Soon', 'Load more rounds feature coming soon!')}
                                className="bg-gray-100 rounded-2xl p-4 mt-4"
                            >
                                <Text className="text-gray-700 text-center font-medium">
                                    Load More Rounds
                                </Text>
                            </TouchableOpacity>
                        )}
                    </>
                )}
            </ScrollView>

            {/* Detailed Scorecard Modal */}
            {selectedRound && (
                <DetailedScorecardModal 
                    round={selectedRound}
                    visible={showDetailModal}
                    onClose={() => {
                        setShowDetailModal(false)
                        setSelectedRound(null)
                    }}
                    onDelete={handleDeleteRound}
                />
            )}
        </SafeAreaView>
    )
}

// Detailed Scorecard Modal Component
const DetailedScorecardModal = ({ round, visible, onClose, onDelete }) => {
    if (!visible || !round) return null

    const getScoreColor = (relativeScore) => {
        if (relativeScore === 0) return 'text-green-600'
        if (relativeScore < 0) return 'text-blue-600'
        return 'text-red-600'
    }

    const getScoreText = (relativeScore) => {
        if (relativeScore === 0) return 'E'
        if (relativeScore > 0) return `+${relativeScore}`
        return `${relativeScore}`
    }

    const formatDate = (dateString) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
    }

    const formatTime = (dateString) => {
        const date = new Date(dateString)
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <SafeAreaView className="flex-1 bg-green-50" edges={['top']}>
                <ScrollView className="flex-1">
                    {/* Header */}
                    <View className="px-6 pt-4 pb-6 bg-white shadow-sm">
                        <View className="flex-row items-center justify-between">
                            <Text className="text-2xl font-bold text-green-900">
                                Full Scorecard
                            </Text>
                            <View className="flex-row items-center space-x-2">
                                <TouchableOpacity
                                    onPress={() => {
                                        onClose()
                                        onDelete(round)
                                    }}
                                    className="p-2"
                                >
                                    <Ionicons name="trash-outline" size={24} color="#EF4444" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={onClose}
                                    className="p-2"
                                >
                                    <Ionicons name="close" size={24} color="#059669" />
                                </TouchableOpacity>
                            </View>
                        </View>
                        
                        <View className="mt-4">
                            <Text className="text-xl font-semibold text-gray-900">
                                {round.course_name}
                            </Text>
                            <Text className="text-gray-600 mt-1">
                                {formatDate(round.start_time)}
                            </Text>
                            {round.end_time && (
                                <Text className="text-gray-500 text-sm mt-1">
                                    {formatTime(round.start_time)} - {formatTime(round.end_time)}
                                </Text>
                            )}
                        </View>
                    </View>

                    {/* Round Summary */}
                    <View className="px-6 py-4">
                        <View className="bg-white rounded-2xl p-6 shadow-sm mb-6">
                            <Text className="text-xl font-bold text-green-900 mb-4">
                                Round Summary
                            </Text>
                            
                            <View className="grid grid-cols-2 gap-4 mb-4">
                                <View className="bg-gray-50 rounded-lg p-3">
                                    <Text className="text-gray-600 text-sm">Total Shots</Text>
                                    <Text className="text-gray-900 font-bold text-2xl">
                                        {round.total_shots || 0}
                                    </Text>
                                </View>
                                
                                <View className="bg-gray-50 rounded-lg p-3">
                                    <Text className="text-gray-600 text-sm">Total Par</Text>
                                    <Text className="text-gray-900 font-bold text-2xl">
                                        {round.total_par || 0}
                                    </Text>
                                </View>
                            </View>
                            
                            <View className="bg-green-50 rounded-lg p-4 border border-green-200">
                                <Text className="text-green-800 font-medium text-center">
                                    Final Score
                                </Text>
                                <Text className={`text-4xl font-bold text-center mt-2 ${getScoreColor(round.score_relative_to_par || 0)}`}>
                                    {round.score_relative_to_par === 0 ? 'Even' :
                                     round.score_relative_to_par > 0 ? `+${round.score_relative_to_par}` :
                                     `${round.score_relative_to_par}`}
                                </Text>
                            </View>
                        </View>

                        {/* Hole-by-Hole Scorecard */}
                        <View className="bg-white rounded-2xl shadow-sm mb-6">
                            <View className="p-4 border-b border-gray-200">
                                <Text className="text-xl font-bold text-green-900">
                                    Hole-by-Hole Scorecard
                                </Text>
                            </View>
                            
                            {/* Scorecard Header */}
                            <View className="flex-row bg-gray-50 py-3 px-4 border-b border-gray-200">
                                <Text className="flex-1 font-semibold text-gray-900 text-center">Hole</Text>
                                <Text className="flex-1 font-semibold text-gray-900 text-center">Par</Text>
                                <Text className="flex-1 font-semibold text-gray-900 text-center">Shots</Text>
                                <Text className="flex-1 font-semibold text-gray-900 text-center">Score</Text>
                            </View>
                            
                            {/* Scorecard Rows */}
                            {round.hole_scores && round.hole_scores.map((hole, index) => (
                                <View 
                                    key={hole.hole_number} 
                                    className={`flex-row py-3 px-4 ${
                                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                    } ${index === round.hole_scores.length - 1 ? '' : 'border-b border-gray-100'}`}
                                >
                                    <Text className="flex-1 text-gray-900 text-center font-medium">
                                        {hole.hole_number}
                                    </Text>
                                    <Text className="flex-1 text-gray-900 text-center">
                                        {hole.par}
                                    </Text>
                                    <Text className="flex-1 text-gray-900 text-center font-semibold">
                                        {hole.shots || '-'}
                                    </Text>
                                    <Text className={`flex-1 text-center font-bold ${
                                        hole.shots === 0 ? 'text-gray-400' : getScoreColor(hole.score_relative_to_par)
                                    }`}>
                                        {hole.shots === 0 ? '-' : getScoreText(hole.score_relative_to_par)}
                                    </Text>
                                </View>
                            ))}
                            
                            {/* Totals Row */}
                            <View className="flex-row bg-green-100 py-4 px-4 border-t-2 border-green-200">
                                <Text className="flex-1 font-bold text-green-900 text-center">TOTAL</Text>
                                <Text className="flex-1 font-bold text-green-900 text-center">
                                    {round.total_par || 0}
                                </Text>
                                <Text className="flex-1 font-bold text-green-900 text-center">
                                    {round.total_shots || 0}
                                </Text>
                                <Text className={`flex-1 font-bold text-center ${getScoreColor(round.score_relative_to_par || 0)}`}>
                                    {round.score_relative_to_par === 0 ? 'E' :
                                     round.score_relative_to_par > 0 ? `+${round.score_relative_to_par}` :
                                     `${round.score_relative_to_par}`}
                                </Text>
                            </View>
                        </View>

                        {/* Round Notes */}
                        {round.notes && (
                            <View className="bg-white rounded-2xl p-6 shadow-sm mb-6">
                                <Text className="text-xl font-bold text-green-900 mb-3">
                                    Round Notes
                                </Text>
                                <Text className="text-gray-700 leading-6">
                                    {round.notes}
                                </Text>
                            </View>
                        )}
                    </View>
                </ScrollView>
            </SafeAreaView>
        </Modal>
    )
} 