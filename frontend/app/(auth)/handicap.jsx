import { useState } from 'react'
import { Text, View, TextInput, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import useRegistrationStore from '../../store/registrationStore'
import { API_BASE_URL } from '../../config/api'

export default function RegisterStep3() {
    const { userData, clubsData, handicapData, setHandicapData, resetRegistration, setStep } = useRegistrationStore()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const validateHandicap = (handicap) => {
        const numericHandicap = parseFloat(handicap)
        return !isNaN(numericHandicap) && numericHandicap >= -7 && numericHandicap <= 54
    }

    const getHandicapErrorMessage = (handicap) => {
        const numericHandicap = parseFloat(handicap)
        if (isNaN(numericHandicap)) {
            return 'Please enter a valid number'
        }
        if (numericHandicap < -7) {
            return 'Plus handicap cannot be better than +7'
        }
        if (numericHandicap > 54) {
            return 'Handicap cannot be higher than 54'
        }
        return ''
    }

    const handleComplete = async () => {
        if (!validateHandicap(handicapData.initialHandicap)) {
            setError(getHandicapErrorMessage(handicapData.initialHandicap))
            return
        }

        setLoading(true)
        try {
            // Register user
            const registerResponse = await fetch(`${API_BASE_URL}/user`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: userData.email,
                    password: userData.password,
                    first_name: userData.firstName,
                    last_name: userData.lastName,
                    initial_handicap: parseFloat(handicapData.initialHandicap),
                }),
            })

            if (!registerResponse.ok) {
                const errorData = await registerResponse.json()
                throw new Error(errorData.detail || 'Registration failed')
            }

            // Login to get token
            const formData = new FormData()
            formData.append('username', userData.email)
            formData.append('password', userData.password)

            const loginResponse = await fetch(`${API_BASE_URL}/auth/token`, {
                method: 'POST',
                body: formData,
            })

            if (!loginResponse.ok) {
                throw new Error('Login failed')
            }

            const { access_token } = await loginResponse.json()

            // Add clubs - filter out empty clubs
            const validClubs = clubsData.filter(club => 
                club.club.trim() !== '' && 
                club.distance_meter !== '' && 
                !isNaN(parseFloat(club.distance_meter))
            )

            if (validClubs.length > 0) {
                const clubsResponse = await fetch(`${API_BASE_URL}/clubs`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${access_token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        clubs: validClubs.map(club => ({
                            club: club.club.trim(),
                            distance_meter: parseFloat(club.distance_meter),
                            preferred_club: club.preferred_club
                        }))
                    }),
                })

                if (!clubsResponse.ok) {
                    const errorData = await clubsResponse.json()
                    throw new Error(errorData.detail || 'Failed to add clubs')
                }
            }

            // Success - reset store and navigate to login
            resetRegistration()
            Alert.alert(
                'Registration Complete',
                'Your account has been created successfully. Please log in.',
                [{ text: 'OK', onPress: () => router.replace('/login') }]
            )
        } catch (error) {
            console.error('Registration error:', error)
            Alert.alert('Error', error.message || 'Registration failed. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const handleBack = () => {
        setStep(2)
        router.back()
    }

    return (
        <SafeAreaView className="flex-1 bg-green-50">
            <ScrollView className="flex-1">
                <View className="flex-1 px-8 py-8">
                    {/* Header */}
                    <View className="items-center mb-10">
                        <View className="w-20 h-20 bg-green-500 rounded-full items-center justify-center mb-6">
                            <Text className="text-white text-2xl font-bold">3/3</Text>
                        </View>
                        <Text className="text-4xl font-bold text-gray-900 mb-3">
                            Handicap
                        </Text>
                        <Text className="text-lg text-gray-500 text-center">
                            Enter your current handicap
                        </Text>
                    </View>

                    {/* Handicap Input */}
                    <View className="bg-white p-6 rounded-xl border border-gray-200 mb-6">
                        <Text className="text-gray-700 mb-2 font-semibold">Handicap</Text>
                        <TextInput
                            className="bg-gray-50 border border-gray-200 p-4 rounded-xl text-center text-2xl"
                            value={handicapData.initialHandicap.toString()}
                            onChangeText={(text) => {
                                setError('')
                                setHandicapData({ initialHandicap: text })
                            }}
                            placeholder="Enter handicap"
                            keyboardType="numbers-and-punctuation"
                        />
                        {error ? <Text className="text-red-500 mt-2 text-center">{error}</Text> : null}
                        
                        <View className="mt-4 space-y-2">
                            <Text className="text-gray-500 text-center">
                                Enter a number between -7 and 54:
                            </Text>
                            <Text className="text-gray-500 text-center">
                                • For regular handicaps: Enter 0 to 54
                            </Text>
                            <Text className="text-gray-500 text-center">
                                • For scratch golfers: Enter 0
                            </Text>
                            <Text className="text-gray-500 text-center">
                                • For plus handicaps: Enter a negative number (e.g., -2 for a +2 handicap)
                            </Text>
                            <Text className="text-gray-500 text-center">
                                • If you don't have an official handicap, enter 54
                            </Text>
                        </View>
                    </View>

                    {/* Navigation Buttons */}
                    <View className="flex-row space-x-4">
                        <TouchableOpacity
                            className="flex-1 bg-gray-100 p-4 rounded-xl"
                            onPress={handleBack}
                        >
                            <Text className="text-center text-gray-600 font-semibold">Back</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            className="flex-1 bg-green-500 p-4 rounded-xl"
                            onPress={handleComplete}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text className="text-center text-white font-semibold">Complete</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    )
} 