import { useState } from 'react'
import { Text, View, TouchableOpacity, ScrollView, ActivityIndicator, Alert, TextInput, TouchableWithoutFeedback, Keyboard, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Link, router } from 'expo-router'
import authStore from '../../store/authStore'
import { API_BASE_URL } from '../../config/api'

export default function ChangePassword() {
    const { token } = authStore()
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState({})
    const [showCurrentPassword, setShowCurrentPassword] = useState(false)
    const [showNewPassword, setShowNewPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    const validateForm = () => {
        const newErrors = {}

        if (!currentPassword) {
            newErrors.currentPassword = 'Current password is required'
        }

        if (!newPassword) {
            newErrors.newPassword = 'New password is required'
        } else if (newPassword.length < 8) {
            newErrors.newPassword = 'New password must be at least 8 characters long'
        }

        if (!confirmPassword) {
            newErrors.confirmPassword = 'Please confirm your new password'
        } else if (newPassword !== confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match'
        }

        if (currentPassword && newPassword && currentPassword === newPassword) {
            newErrors.newPassword = 'New password must be different from current password'
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleChangePassword = async () => {
        if (!validateForm()) {
            return
        }

        setLoading(true)
        try {
            const response = await fetch(`${API_BASE_URL}/change-password`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    current_password: currentPassword,
                    new_password: newPassword
                })
            })

            if (!response.ok) {
                const errorData = await response.json()
                
                // Handle specific error cases
                if (response.status === 400) {
                    if (errorData.detail?.includes('Current password is incorrect')) {
                        setErrors({ currentPassword: 'Current password is incorrect' })
                        return
                    } else if (errorData.detail?.includes('New password must be different')) {
                        setErrors({ newPassword: 'New password must be different from current password' })
                        return
                    }
                }
                
                throw new Error(errorData.detail || `HTTP error! status: ${response.status}`)
            }

            const result = await response.json()
            
            Alert.alert(
                'Success', 
                'Password changed successfully! Please log in again with your new password.',
                [
                    { 
                        text: 'OK', 
                        onPress: () => {
                            // Clear form
                            setCurrentPassword('')
                            setNewPassword('')
                            setConfirmPassword('')
                            router.back()
                        }
                    }
                ]
            )
            
        } catch (err) {
            console.error('Error changing password:', err)
            Alert.alert('Error', err.message || 'Failed to change password. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const isFormValid = () => {
        return currentPassword && newPassword && confirmPassword && 
               newPassword.length >= 8 && newPassword === confirmPassword &&
               currentPassword !== newPassword
    }

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
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
                                        Change Password
                                    </Text>
                                    <Text className="text-green-700 mt-1">
                                        Update your account password
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Form */}
                        <View className="px-6">
                            <View className="bg-white rounded-2xl p-6 shadow-sm mb-6">
                                {/* Security Info */}
                                <View className="bg-blue-50 rounded-xl p-4 mb-6">
                                    <View className="flex-row items-start">
                                        <Ionicons name="shield-checkmark" size={20} color="#3B82F6" />
                                        <View className="ml-3 flex-1">
                                            <Text className="text-blue-900 font-semibold mb-1">
                                                Password Security Tips
                                            </Text>
                                            <Text className="text-blue-700 text-sm">
                                                • Use at least 8 characters{'\n'}
                                                • Include uppercase and lowercase letters{'\n'}
                                                • Add numbers and special characters{'\n'}
                                                • Avoid common words or personal info
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                {/* Current Password */}
                                <View className="mb-6">
                                    <Text className="text-gray-700 font-semibold mb-2">Current Password</Text>
                                    <View className="relative">
                                        <TextInput
                                            value={currentPassword}
                                            onChangeText={(text) => {
                                                setCurrentPassword(text)
                                                if (errors.currentPassword) {
                                                    setErrors(prev => ({ ...prev, currentPassword: null }))
                                                }
                                            }}
                                            placeholder="Enter your current password"
                                            secureTextEntry={!showCurrentPassword}
                                            className={`bg-gray-50 rounded-xl p-4 pr-12 text-gray-900 ${
                                                errors.currentPassword ? 'border border-red-500' : ''
                                            }`}
                                            placeholderTextColor="#9CA3AF"
                                        />
                                        <TouchableOpacity
                                            onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                                            className="absolute right-4 top-4"
                                        >
                                            <Ionicons 
                                                name={showCurrentPassword ? "eye-off" : "eye"} 
                                                size={20} 
                                                color="#9CA3AF" 
                                            />
                                        </TouchableOpacity>
                                    </View>
                                    {errors.currentPassword && (
                                        <Text className="text-red-500 text-sm mt-1">{errors.currentPassword}</Text>
                                    )}
                                </View>

                                {/* New Password */}
                                <View className="mb-6">
                                    <Text className="text-gray-700 font-semibold mb-2">New Password</Text>
                                    <View className="relative">
                                        <TextInput
                                            value={newPassword}
                                            onChangeText={(text) => {
                                                setNewPassword(text)
                                                if (errors.newPassword) {
                                                    setErrors(prev => ({ ...prev, newPassword: null }))
                                                }
                                            }}
                                            placeholder="Enter your new password"
                                            secureTextEntry={!showNewPassword}
                                            className={`bg-gray-50 rounded-xl p-4 pr-12 text-gray-900 ${
                                                errors.newPassword ? 'border border-red-500' : ''
                                            }`}
                                            placeholderTextColor="#9CA3AF"
                                        />
                                        <TouchableOpacity
                                            onPress={() => setShowNewPassword(!showNewPassword)}
                                            className="absolute right-4 top-4"
                                        >
                                            <Ionicons 
                                                name={showNewPassword ? "eye-off" : "eye"} 
                                                size={20} 
                                                color="#9CA3AF" 
                                            />
                                        </TouchableOpacity>
                                    </View>
                                    {errors.newPassword && (
                                        <Text className="text-red-500 text-sm mt-1">{errors.newPassword}</Text>
                                    )}
                                    {newPassword && newPassword.length < 8 && !errors.newPassword && (
                                        <Text className="text-orange-500 text-sm mt-1">
                                            Password must be at least 8 characters
                                        </Text>
                                    )}
                                </View>

                                {/* Confirm New Password */}
                                <View className="mb-6">
                                    <Text className="text-gray-700 font-semibold mb-2">Confirm New Password</Text>
                                    <View className="relative">
                                        <TextInput
                                            value={confirmPassword}
                                            onChangeText={(text) => {
                                                setConfirmPassword(text)
                                                if (errors.confirmPassword) {
                                                    setErrors(prev => ({ ...prev, confirmPassword: null }))
                                                }
                                            }}
                                            placeholder="Confirm your new password"
                                            secureTextEntry={!showConfirmPassword}
                                            className={`bg-gray-50 rounded-xl p-4 pr-12 text-gray-900 ${
                                                errors.confirmPassword ? 'border border-red-500' : ''
                                            }`}
                                            placeholderTextColor="#9CA3AF"
                                        />
                                        <TouchableOpacity
                                            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-4 top-4"
                                        >
                                            <Ionicons 
                                                name={showConfirmPassword ? "eye-off" : "eye"} 
                                                size={20} 
                                                color="#9CA3AF" 
                                            />
                                        </TouchableOpacity>
                                    </View>
                                    {errors.confirmPassword && (
                                        <Text className="text-red-500 text-sm mt-1">{errors.confirmPassword}</Text>
                                    )}
                                    {confirmPassword && newPassword && confirmPassword !== newPassword && !errors.confirmPassword && (
                                        <Text className="text-orange-500 text-sm mt-1">
                                            Passwords do not match
                                        </Text>
                                    )}
                                    {confirmPassword && newPassword && confirmPassword === newPassword && (
                                        <Text className="text-green-600 text-sm mt-1">
                                            ✓ Passwords match
                                        </Text>
                                    )}
                                </View>
                            </View>

                            {/* Change Password Button */}
                            <TouchableOpacity 
                                onPress={handleChangePassword}
                                disabled={loading || !isFormValid()}
                                className={`bg-green-600 rounded-2xl p-4 shadow-sm mb-6 ${
                                    (!isFormValid() || loading) ? 'opacity-50' : ''
                                }`}
                            >
                                <View className="flex-row items-center justify-center">
                                    {loading ? (
                                        <>
                                            <ActivityIndicator size="small" color="white" />
                                            <Text className="text-white font-bold ml-2">Changing Password...</Text>
                                        </>
                                    ) : (
                                        <>
                                            <Ionicons name="lock-closed" size={20} color="white" />
                                            <Text className="text-white font-bold ml-2">
                                                Change Password
                                            </Text>
                                        </>
                                    )}
                                </View>
                            </TouchableOpacity>

                            {/* Warning */}
                            <View className="bg-orange-50 rounded-2xl p-4 mb-6">
                                <View className="flex-row items-start">
                                    <Ionicons name="warning" size={20} color="#F59E0B" />
                                    <View className="ml-3 flex-1">
                                        <Text className="text-orange-900 font-semibold mb-1">
                                            Important Notice
                                        </Text>
                                        <Text className="text-orange-700 text-sm">
                                            After changing your password, you may need to log in again on all your devices.
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </TouchableWithoutFeedback>
    )
} 