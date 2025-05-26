import { useState, useEffect } from 'react'
import { Text, View, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import useRoundStore from '../../store/roundStore'

export default function StartRound() {
    const [courseName, setCourseName] = useState('')
    const [totalHoles, setTotalHoles] = useState(18)
    const [loading, setLoading] = useState(false)
    
    const { startRound, getActiveRound } = useRoundStore()

    // No need to pre-configure holes anymore

    // Check for active round on mount
    useEffect(() => {
        checkActiveRound()
    }, [])

    const checkActiveRound = async () => {
        try {
            const activeRound = await getActiveRound()
            if (activeRound) {
                Alert.alert(
                    'Active Round Found',
                    `You have an active round at ${activeRound.course_name}. Would you like to continue it?`,
                    [
                        {
                            text: 'Start New Round',
                            style: 'destructive',
                            onPress: () => {
                                // User wants to start new round anyway
                            }
                        },
                        {
                            text: 'Continue Round',
                            onPress: () => {
                                router.push('/(dashboard)/caddie')
                            }
                        }
                    ]
                )
            }
        } catch (error) {
            console.error('Error checking active round:', error)
        }
    }

    // Remove hole par update function since we'll set par on the fly

    const handleStartRound = async () => {
        if (!courseName.trim()) {
            Alert.alert('Error', 'Please enter a course name')
            return
        }

        try {
            setLoading(true)
            
            // Create holes with default par 4 - user will set actual par as they play
            const defaultHoles = Array.from({ length: totalHoles }, (_, index) => ({
                hole_number: index + 1,
                par: 4 // Default par that can be changed during play
            }))
            
            await startRound(courseName.trim(), totalHoles, defaultHoles)
            
            // Navigate directly to caddie page
            router.push('/(dashboard)/caddie')
        } catch (error) {
            Alert.alert('Error', error.message)
        } finally {
            setLoading(false)
        }
    }

    // Remove quick par and total par functions since we're not pre-configuring

    return (
        <SafeAreaView className="flex-1 bg-white" edges={['top']}>
            {/* Header */}
            <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
                <TouchableOpacity 
                    onPress={() => router.back()}
                    className="p-2"
                >
                    <Ionicons name="arrow-back" size={24} color="#374151" />
                </TouchableOpacity>
                
                <Text className="text-xl font-bold text-gray-900">Start New Round</Text>
                
                <View className="w-10" />
            </View>

            <ScrollView className="flex-1 p-4">
                {/* Course Name */}
                <View className="mb-6">
                    <Text className="text-lg font-semibold text-gray-900 mb-2">Course Name</Text>
                    <TextInput
                        value={courseName}
                        onChangeText={setCourseName}
                        placeholder="Enter course name"
                        className="border border-gray-300 rounded-lg px-4 py-3 text-base"
                        maxLength={100}
                    />
                </View>

                {/* Number of Holes */}
                <View className="mb-6">
                    <Text className="text-lg font-semibold text-gray-900 mb-3">Number of Holes</Text>
                    <View className="flex-row space-x-4">
                        <TouchableOpacity
                            onPress={() => setTotalHoles(9)}
                            className={`flex-1 py-3 px-4 rounded-lg border-2 ${
                                totalHoles === 9 
                                    ? 'border-green-500 bg-green-50' 
                                    : 'border-gray-300 bg-white'
                            }`}
                        >
                            <Text className={`text-center font-semibold ${
                                totalHoles === 9 ? 'text-green-700' : 'text-gray-700'
                            }`}>
                                9 Holes
                            </Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                            onPress={() => setTotalHoles(18)}
                            className={`flex-1 py-3 px-4 rounded-lg border-2 ${
                                totalHoles === 18 
                                    ? 'border-green-500 bg-green-50' 
                                    : 'border-gray-300 bg-white'
                            }`}
                        >
                            <Text className={`text-center font-semibold ${
                                totalHoles === 18 ? 'text-green-700' : 'text-gray-700'
                            }`}>
                                18 Holes
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* How It Works */}
                <View className="mb-6">
                    <Text className="text-lg font-semibold text-gray-900 mb-3">How It Works</Text>
                    <View className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <View className="space-y-3">
                            <View className="flex-row items-start">
                                <View className="w-6 h-6 bg-blue-500 rounded-full items-center justify-center mr-3 mt-0.5">
                                    <Text className="text-white font-bold text-sm">1</Text>
                                </View>
                                <Text className="text-blue-800 flex-1">
                                    Start your round with just the course name and number of holes
                                </Text>
                            </View>
                            
                            <View className="flex-row items-start">
                                <View className="w-6 h-6 bg-blue-500 rounded-full items-center justify-center mr-3 mt-0.5">
                                    <Text className="text-white font-bold text-sm">2</Text>
                                </View>
                                <Text className="text-blue-800 flex-1">
                                    Set the par for each hole as you play (default is Par 4)
                                </Text>
                            </View>
                            
                            <View className="flex-row items-start">
                                <View className="w-6 h-6 bg-blue-500 rounded-full items-center justify-center mr-3 mt-0.5">
                                    <Text className="text-white font-bold text-sm">3</Text>
                                </View>
                                <Text className="text-blue-800 flex-1">
                                    Track your shots and save scores hole by hole
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Start Round Button */}
                <TouchableOpacity
                    onPress={handleStartRound}
                    disabled={loading || !courseName.trim()}
                    className={`py-4 px-6 rounded-lg ${
                        loading || !courseName.trim()
                            ? 'bg-gray-300'
                            : 'bg-green-600'
                    }`}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text className="text-white text-center text-lg font-bold">
                            Start Round
                        </Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    )
} 