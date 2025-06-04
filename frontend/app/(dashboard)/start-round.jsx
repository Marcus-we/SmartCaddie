import { useState, useEffect } from 'react'
import { Text, View, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator, FlatList } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import useRoundStore from '../../store/roundStore'

export default function StartRound() {
    const [searchTerm, setSearchTerm] = useState('')
    const [searchTimeout, setSearchTimeout] = useState(null)
    
    const { 
        startRound, 
        getActiveRound, 
        searchCourses,
        availableCourses,
        selectedCourse,
        selectedTee,
        setSelectedCourse,
        setSelectedTee,
        loading 
    } = useRoundStore()

    // Check for active round on mount
    useEffect(() => {
        checkActiveRound()
    }, [])

    // Handle search with debounce
    useEffect(() => {
        if (searchTimeout) {
            clearTimeout(searchTimeout)
        }
        
        if (searchTerm.trim()) {
            const timeout = setTimeout(() => {
                searchCourses(searchTerm)
            }, 500)
            
            setSearchTimeout(timeout)
        }
    }, [searchTerm])

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

    const handleStartRound = async () => {
        if (!selectedCourse || !selectedTee) {
            Alert.alert('Error', 'Please select a course and tee')
            return
        }

        try {
            await startRound()
            router.push('/(dashboard)/caddie')
        } catch (error) {
            Alert.alert('Error', error.message)
        }
    }

    const renderCourseItem = ({ item }) => (
        <TouchableOpacity
            onPress={() => setSelectedCourse(item)}
            className={`p-4 border-b border-gray-200 ${
                selectedCourse?.id === item.id ? 'bg-green-50' : ''
            }`}
        >
            <Text className="text-lg font-semibold text-gray-900">{item.course_name}</Text>
            <Text className="text-sm text-gray-600">{item.location}</Text>
            <Text className="text-sm text-gray-600">{item.total_holes} holes</Text>
        </TouchableOpacity>
    )

    const renderTeeItem = ({ item }) => (
        <TouchableOpacity
            onPress={() => setSelectedTee(item)}
            className={`flex-1 p-4 m-1 rounded-lg border ${
                selectedTee?.id === item.id
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-300'
            }`}
        >
            <Text className={`text-center font-semibold ${
                selectedTee?.id === item.id ? 'text-green-700' : 'text-gray-700'
            }`}>
                {item.tee_name}
            </Text>
            <Text className="text-center text-sm text-gray-600">
                {item.total_distance_meters} meters
            </Text>
            <Text className="text-center text-sm text-gray-600">
                Par {item.total_par}
            </Text>
        </TouchableOpacity>
    )

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

            <View className="flex-1">
                {/* Search Bar */}
                <View className="p-4 border-b border-gray-200">
                    <TextInput
                        value={searchTerm}
                        onChangeText={setSearchTerm}
                        placeholder="Search for a golf course..."
                        className="border border-gray-300 rounded-lg px-4 py-3 text-base"
                    />
                </View>

                {loading ? (
                    <View className="flex-1 justify-center items-center">
                        <ActivityIndicator size="large" color="#10B981" />
                    </View>
                ) : (
                    <>
                        {/* Course List */}
                        {!selectedCourse ? (
                            <FlatList
                                data={availableCourses}
                                renderItem={renderCourseItem}
                                keyExtractor={item => item.id.toString()}
                                className="flex-1"
                            />
                        ) : (
                            // Tee Selection
                            <View className="flex-1 p-4">
                                <View className="mb-4">
                                    <Text className="text-lg font-semibold text-gray-900 mb-2">
                                        Selected Course
                                    </Text>
                                    <View className="bg-gray-50 p-4 rounded-lg">
                                        <Text className="text-lg font-semibold text-gray-900">
                                            {selectedCourse.course_name}
                                        </Text>
                                        <Text className="text-sm text-gray-600">
                                            {selectedCourse.location}
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => setSelectedCourse(null)}
                                        className="mt-2"
                                    >
                                        <Text className="text-blue-600">Change Course</Text>
                                    </TouchableOpacity>
                                </View>

                                <Text className="text-lg font-semibold text-gray-900 mb-2">
                                    Select Tee
                                </Text>
                                <FlatList
                                    data={selectedCourse.tees}
                                    renderItem={renderTeeItem}
                                    keyExtractor={item => item.id.toString()}
                                    numColumns={2}
                                    className="flex-1"
                                />
                            </View>
                        )}

                        {/* Start Round Button */}
                        {selectedCourse && selectedTee && (
                            <View className="p-4">
                                <TouchableOpacity
                                    onPress={handleStartRound}
                                    disabled={loading}
                                    className={`py-4 px-6 rounded-lg ${
                                        loading ? 'bg-gray-300' : 'bg-green-600'
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
                            </View>
                        )}
                    </>
                )}
            </View>
        </SafeAreaView>
    )
} 