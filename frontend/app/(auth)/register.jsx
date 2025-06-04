import { useState } from 'react'
import { Text, View, TextInput, TouchableOpacity, Alert, TouchableWithoutFeedback, Keyboard, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import useRegistrationStore from '../../store/registrationStore'

export default function RegisterStep1() {
    const { userData, setUserData, setStep } = useRegistrationStore()
    const [errors, setErrors] = useState({})
    const [confirmPassword, setConfirmPassword] = useState('')

    const validateForm = () => {
        const newErrors = {}
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

        if (!userData.email) {
            newErrors.email = 'Email is required'
        } else if (!emailRegex.test(userData.email)) {
            newErrors.email = 'Invalid email format'
        }

        if (!userData.firstName) {
            newErrors.firstName = 'First name is required'
        }

        if (!userData.lastName) {
            newErrors.lastName = 'Last name is required'
        }

        if (!userData.password) {
            newErrors.password = 'Password is required'
        } else if (userData.password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters'
        }

        if (userData.password !== confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match'
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleNext = () => {
        if (validateForm()) {
            setStep(2)
            router.push('/clubs')
        }
    }

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <SafeAreaView className="flex-1 bg-green-50">
                <KeyboardAvoidingView 
                    className="flex-1"
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
                >
                    <View className="flex-1 justify-center px-8">
                        {/* Header */}
                        <View className="items-center mb-10">
                            <View className="w-20 h-20 bg-green-500 rounded-full items-center justify-center mb-6">
                                <Text className="text-white text-2xl font-bold">1/3</Text>
                            </View>
                            <Text className="text-4xl font-bold text-gray-900 mb-3">
                                Create Account
                            </Text>
                            <Text className="text-lg text-gray-500 text-center">
                                Let's start with your basic information
                            </Text>
                        </View>

                        {/* Form */}
                        <View className="space-y-4">
                            <View>
                                <Text className="text-gray-700 mb-2 font-semibold">Email Address</Text>
                                <TextInput
                                    className="bg-white border border-gray-200 p-4 rounded-xl"
                                    value={userData.email}
                                    onChangeText={(text) => setUserData({ email: text })}
                                    placeholder="Enter your email"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                                {errors.email && <Text className="text-red-500 mt-1">{errors.email}</Text>}
                            </View>

                            <View>
                                <Text className="text-gray-700 mb-2 font-semibold">First Name</Text>
                                <TextInput
                                    className="bg-white border border-gray-200 p-4 rounded-xl"
                                    value={userData.firstName}
                                    onChangeText={(text) => setUserData({ firstName: text })}
                                    placeholder="Enter your first name"
                                />
                                {errors.firstName && <Text className="text-red-500 mt-1">{errors.firstName}</Text>}
                            </View>

                            <View>
                                <Text className="text-gray-700 mb-2 font-semibold">Last Name</Text>
                                <TextInput
                                    className="bg-white border border-gray-200 p-4 rounded-xl"
                                    value={userData.lastName}
                                    onChangeText={(text) => setUserData({ lastName: text })}
                                    placeholder="Enter your last name"
                                />
                                {errors.lastName && <Text className="text-red-500 mt-1">{errors.lastName}</Text>}
                            </View>

                            <View>
                                <Text className="text-gray-700 mb-2 font-semibold">Password</Text>
                                <TextInput
                                    className="bg-white border border-gray-200 p-4 rounded-xl"
                                    value={userData.password}
                                    onChangeText={(text) => setUserData({ password: text })}
                                    placeholder="Create a password"
                                    secureTextEntry
                                />
                                {errors.password && <Text className="text-red-500 mt-1">{errors.password}</Text>}
                            </View>

                            <View>
                                <Text className="text-gray-700 mb-2 font-semibold">Confirm Password</Text>
                                <TextInput
                                    className="bg-white border border-gray-200 p-4 rounded-xl"
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    placeholder="Confirm your password"
                                    secureTextEntry
                                />
                                {errors.confirmPassword && <Text className="text-red-500 mt-1">{errors.confirmPassword}</Text>}
                            </View>

                            <TouchableOpacity
                                className="bg-green-500 py-4 rounded-xl mt-6"
                                onPress={handleNext}
                            >
                                <Text className="text-white text-center text-lg font-bold">
                                    Next
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </TouchableWithoutFeedback>
    )
} 