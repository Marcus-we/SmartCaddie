import { useState } from 'react'
import { Text, View, TextInput, TouchableOpacity, ScrollView, Alert, Switch, Modal, FlatList } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import useRegistrationStore from '../../store/registrationStore'

// Common club suggestions
const CLUB_SUGGESTIONS = [
    // Drivers
    { name: 'Driver' },
    
    // Fairway Woods
    { name: '3 Wood' },
    { name: '4 Wood' },
    { name: '5 Wood' },
    { name: '7 Wood' },
    { name: '9 Wood' },
    { name: '11 Wood' },
    
    // Hybrids/Rescue Clubs
    { name: '2 Hybrid' },
    { name: '3 Hybrid' },
    { name: '4 Hybrid' },
    { name: '5 Hybrid' },
    { name: '6 Hybrid' },
    { name: '7 Hybrid' },
    
    // Irons
    { name: '1 Iron' },
    { name: '2 Iron' },
    { name: '3 Iron' },
    { name: '4 Iron' },
    { name: '5 Iron' },
    { name: '6 Iron' },
    { name: '7 Iron' },
    { name: '8 Iron' },
    { name: '9 Iron' },
    
    // Wedges
    { name: 'Pitching Wedge' },
    { name: 'Gap Wedge' },
    { name: 'Sand Wedge' },
    { name: 'Lob Wedge' },
    { name: '60° Wedge' },
    { name: '64° Wedge' },
]

export default function RegisterStep2() {
    const { clubsData, addClub, removeClub, updateClub, setStep } = useRegistrationStore()
    const [errors, setErrors] = useState({})
    const [showClubPicker, setShowClubPicker] = useState(false)
    const [selectedClubIndex, setSelectedClubIndex] = useState(null)

    const validateClubs = () => {
        const newErrors = {}
        let hasAtLeastOne = false

        clubsData.forEach((club, index) => {
            if (!club.club.trim()) {
                newErrors[`${index}-name`] = 'Club name is required'
            }

            if (club.distance_meter) {
                hasAtLeastOne = true
                const distance = parseFloat(club.distance_meter)
                if (isNaN(distance) || distance < 0 || distance > 335) { // ~365 meters max
                    newErrors[`${index}-distance`] = 'Distance must be between 0 and 335 meters'
                }
            }
        })

        if (!hasAtLeastOne) {
            Alert.alert('Error', 'Please enter distance for at least one club')
            return false
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleNext = () => {
        if (validateClubs()) {
            setStep(3)
            router.push('/handicap')
        }
    }

    const handleBack = () => {
        setStep(1)
        router.back()
    }

    const handleUpdateClub = (index, field, value) => {
        updateClub(index, field, value)
        setErrors({})
    }

    const openClubPicker = (index) => {
        setSelectedClubIndex(index)
        setShowClubPicker(true)
    }

    const handleSelectClub = (clubName) => {
        if (selectedClubIndex !== null) {
            handleUpdateClub(selectedClubIndex, 'club', clubName)
            setShowClubPicker(false)
            setSelectedClubIndex(null)
        }
    }

    const ClubPicker = () => (
        <Modal
            visible={showClubPicker}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowClubPicker(false)}
        >
            <TouchableOpacity 
                activeOpacity={1} 
                onPress={() => setShowClubPicker(false)} 
                className="flex-1 justify-end"
            >
                <TouchableOpacity 
                    activeOpacity={1}
                    onPress={(e) => e.stopPropagation()} 
                    className="bg-white rounded-t-3xl shadow-lg"
                >
                    <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
                        <Text className="text-lg font-bold text-gray-900">Select Club</Text>
                        <TouchableOpacity onPress={() => setShowClubPicker(false)}>
                            <Ionicons name="close" size={24} color="#666666" />
                        </TouchableOpacity>
                    </View>
                    <FlatList
                        data={CLUB_SUGGESTIONS}
                        keyExtractor={(item) => item.name}
                        className="max-h-96"
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                className="p-4 border-b border-gray-100"
                                onPress={() => handleSelectClub(item.name)}
                            >
                                <Text className="text-lg text-gray-900">{item.name}</Text>
                            </TouchableOpacity>
                        )}
                    />
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    )

    return (
        <SafeAreaView className="flex-1 bg-green-50">
            <ScrollView className="flex-1">
                <View className="flex-1 px-6 py-8">
                    {/* Header */}
                    <View className="items-center mb-8">
                        <View className="w-20 h-20 bg-green-500 rounded-full items-center justify-center mb-6">
                            <Text className="text-white text-2xl font-bold">2/3</Text>
                        </View>
                        <Text className="text-4xl font-bold text-gray-900 mb-3">
                            Your Clubs
                        </Text>
                        <Text className="text-lg text-gray-500 text-center">
                            Add the clubs in your bag with their distances
                        </Text>
                    </View>

                    {/* Club List */}
                    <View className="gap-6">
                        {clubsData.map((club, index) => (
                            <View key={index} className="bg-white rounded-xl p-4 shadow-sm">
                                <View className="flex-row items-center justify-between mb-4">
                                    <Text className="text-lg font-bold text-gray-900">
                                        Club {index + 1}
                                    </Text>
                                    {clubsData.length > 1 && (
                                        <TouchableOpacity 
                                            onPress={() => removeClub(index)}
                                            className="p-1"
                                        >
                                            <Ionicons name="close-circle" size={24} color="#DC2626" />
                                        </TouchableOpacity>
                                    )}
                                </View>

                                {/* Club Selection */}
                                <View className="mb-4">
                                    <Text className="text-gray-700 mb-2 font-semibold">Club Name</Text>
                                    <TouchableOpacity
                                        onPress={() => openClubPicker(index)}
                                        className="bg-gray-50 border border-gray-200 p-4 rounded-xl"
                                    >
                                        <Text className={club.club ? "text-gray-900" : "text-gray-400"}>
                                            {club.club || "Select a club"}
                                        </Text>
                                    </TouchableOpacity>
                                    {errors[`${index}-name`] && (
                                        <Text className="text-red-500 mt-1">{errors[`${index}-name`]}</Text>
                                    )}
                                </View>

                                {/* Distance */}
                                <View className="mb-4">
                                    <Text className="text-gray-700 mb-2 font-semibold">Average Distance (meters)</Text>
                                    <TextInput
                                        className="bg-gray-50 border border-gray-200 p-4 rounded-xl"
                                        value={club.distance_meter}
                                        onChangeText={(text) => handleUpdateClub(index, 'distance_meter', text)}
                                        placeholder="Enter distance in meters"
                                        keyboardType="numeric"
                                    />
                                    {errors[`${index}-distance`] && (
                                        <Text className="text-red-500 mt-1">{errors[`${index}-distance`]}</Text>
                                    )}
                                </View>

                                {/* Preferred Club */}
                                <View className="flex-row items-center justify-between">
                                    <Text className="text-gray-700 font-semibold">Preferred Club</Text>
                                    <Switch
                                        value={club.preferred_club}
                                        onValueChange={(value) => handleUpdateClub(index, 'preferred_club', value)}
                                        trackColor={{ false: '#E5E7EB', true: '#059669' }}
                                        thumbColor={club.preferred_club ? '#FFFFFF' : '#FFFFFF'}
                                    />
                                </View>
                            </View>
                        ))}
                    </View>

                    {/* Add Another Club Button */}
                    <TouchableOpacity 
                        onPress={addClub}
                        className="bg-green-100 rounded-xl p-4 shadow-sm my-6 border-2 border-dashed border-green-300"
                    >
                        <View className="flex-row items-center justify-center">
                            <Ionicons name="add-circle-outline" size={24} color="#059669" />
                            <Text className="text-green-700 font-bold ml-2">Add Another Club</Text>
                        </View>
                    </TouchableOpacity>

                    {/* Navigation Buttons */}
                    <View className="mt-8 space-y-3">
                        <TouchableOpacity
                            className="bg-green-500 py-4 rounded-xl"
                            onPress={handleNext}
                        >
                            <Text className="text-white text-center text-lg font-bold">
                                Next
                            </Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                            className="py-4 rounded-xl"
                            onPress={handleBack}
                        >
                            <Text className="text-gray-600 text-center">
                                Back
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>

            <ClubPicker />
        </SafeAreaView>
    )
} 