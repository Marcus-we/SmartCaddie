import { useState, useEffect } from 'react'
import { Text, View, TouchableOpacity, ScrollView, ActivityIndicator, Alert, TextInput, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Link, router } from 'expo-router'
import authStore from '../../store/authStore'
import { API_BASE_URL } from '../../config/api'

export default function EditProfile() {
    const { token, userData, setUserData } = authStore()
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState({})

    useEffect(() => {
        // Pre-populate form with current user data
        if (userData) {
            setFirstName(userData.first_name || '')
            setLastName(userData.last_name || '')
        }
    }, [userData])

    const validateForm = () => {
        const newErrors = {}

        if (!firstName.trim()) {
            newErrors.firstName = 'First name is required'
        } else if (firstName.trim().length < 2) {
            newErrors.firstName = 'First name must be at least 2 characters'
        }

        if (!lastName.trim()) {
            newErrors.lastName = 'Last name is required'
        } else if (lastName.trim().length < 2) {
            newErrors.lastName = 'Last name must be at least 2 characters'
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSave = async () => {
        if (!validateForm()) {
            return
        }

        setLoading(true)
        try {
            const response = await fetch(`${API_BASE_URL}/profile`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    first_name: firstName.trim(),
                    last_name: lastName.trim()
                })
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.detail || `HTTP error! status: ${response.status}`)
            }

            const updatedUser = await response.json()
            
            // Update user data in auth store
            await setUserData({
                ...userData,
                first_name: updatedUser.first_name,
                last_name: updatedUser.last_name
            })
            
            Alert.alert('Success', 'Profile updated successfully!', [
                { text: 'OK', onPress: () => router.back() }
            ])
            
        } catch (err) {
            console.error('Error updating profile:', err)
            Alert.alert('Error', err.message || 'Failed to update profile. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const hasChanges = () => {
        return firstName.trim() !== (userData?.first_name || '') || 
               lastName.trim() !== (userData?.last_name || '')
    }

    return (
        <SafeAreaView className="flex-1 bg-green-50">
            <KeyboardAvoidingView 
                className="flex-1"
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <ScrollView 
                    className="flex-1"
                    contentContainerStyle={{ flexGrow: 1 }}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Header */}
                    <View className="px-6 pt-4 pb-6">
                        <View className="flex-row items-center mb-4">
                            <Link href="/(dashboard)/profile" asChild>
                                <TouchableOpacity className="p-2 mr-3">
                                    <Ionicons name="arrow-back" size={24} color="#059669" />
                                </TouchableOpacity>
                            </Link>
                            <View className="flex-1">
                                <Text className="text-3xl font-bold text-green-900">
                                    Edit Profile
                                </Text>
                                <Text className="text-green-700 mt-1">
                                    Update your personal information
                                </Text>
                            </View>
                            <TouchableOpacity 
                                onPress={handleSave}
                                disabled={loading || !hasChanges()}
                                className={`p-2 ${(!hasChanges() || loading) ? 'opacity-50' : ''}`}
                            >
                                {loading ? (
                                    <ActivityIndicator size="small" color="#059669" />
                                ) : (
                                    <Text className="text-green-600 font-semibold">Save</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Form */}
                    <View className="px-6">
                        <View className="bg-white rounded-2xl p-6 shadow-sm mb-6">
                            {/* Profile Picture Section */}
                            <View className="items-center mb-8">
                                <View className="w-24 h-24 bg-green-600 rounded-full items-center justify-center mb-4">
                                    <Text className="text-white text-3xl font-bold">
                                        {firstName?.[0]?.toUpperCase() || userData?.first_name?.[0]?.toUpperCase() || 'G'}
                                        {lastName?.[0]?.toUpperCase() || userData?.last_name?.[0]?.toUpperCase() || 'U'}
                                    </Text>
                                </View>
                                <Text className="text-gray-600 text-sm">
                                    Profile picture updates coming soon
                                </Text>
                            </View>

                            {/* First Name */}
                            <View className="mb-6">
                                <Text className="text-gray-700 font-semibold mb-2">First Name</Text>
                                <TextInput
                                    value={firstName}
                                    onChangeText={(text) => {
                                        setFirstName(text)
                                        if (errors.firstName) {
                                            setErrors(prev => ({ ...prev, firstName: null }))
                                        }
                                    }}
                                    placeholder="Enter your first name"
                                    className={`bg-gray-50 rounded-xl p-4 text-gray-900 ${
                                        errors.firstName ? 'border border-red-500' : ''
                                    }`}
                                    placeholderTextColor="#9CA3AF"
                                />
                                {errors.firstName && (
                                    <Text className="text-red-500 text-sm mt-1">{errors.firstName}</Text>
                                )}
                            </View>

                            {/* Last Name */}
                            <View className="mb-6">
                                <Text className="text-gray-700 font-semibold mb-2">Last Name</Text>
                                <TextInput
                                    value={lastName}
                                    onChangeText={(text) => {
                                        setLastName(text)
                                        if (errors.lastName) {
                                            setErrors(prev => ({ ...prev, lastName: null }))
                                        }
                                    }}
                                    placeholder="Enter your last name"
                                    className={`bg-gray-50 rounded-xl p-4 text-gray-900 ${
                                        errors.lastName ? 'border border-red-500' : ''
                                    }`}
                                    placeholderTextColor="#9CA3AF"
                                />
                                {errors.lastName && (
                                    <Text className="text-red-500 text-sm mt-1">{errors.lastName}</Text>
                                )}
                            </View>

                            {/* Email (Read-only) */}
                            <View className="mb-6">
                                <Text className="text-gray-700 font-semibold mb-2">Email</Text>
                                <View className="bg-gray-100 rounded-xl p-4">
                                    <Text className="text-gray-600">{userData?.email}</Text>
                                </View>
                                <Text className="text-gray-500 text-sm mt-1">
                                    Email cannot be changed at this time
                                </Text>
                            </View>
                        </View>

                        {/* Save Button */}
                        <TouchableOpacity 
                            onPress={handleSave}
                            disabled={loading || !hasChanges()}
                            className={`bg-green-600 rounded-2xl p-4 shadow-sm mb-6 ${
                                (!hasChanges() || loading) ? 'opacity-50' : ''
                            }`}
                        >
                            <View className="flex-row items-center justify-center">
                                {loading ? (
                                    <>
                                        <ActivityIndicator size="small" color="white" />
                                        <Text className="text-white font-bold ml-2">Saving...</Text>
                                    </>
                                ) : (
                                    <>
                                        <Ionicons name="checkmark-circle" size={20} color="white" />
                                        <Text className="text-white font-bold ml-2">
                                            Save Changes
                                        </Text>
                                    </>
                                )}
                            </View>
                        </TouchableOpacity>

                        {!hasChanges() && (
                            <View className="bg-blue-50 rounded-2xl p-4 mb-6">
                                <View className="flex-row items-center">
                                    <Ionicons name="information-circle" size={20} color="#3B82F6" />
                                    <Text className="text-blue-700 ml-2 flex-1">
                                        Make changes to your profile information to enable saving
                                    </Text>
                                </View>
                            </View>
                        )}
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    )
} 