import { useState } from 'react'
import { Text, View, TextInput, TouchableOpacity, Alert, TouchableWithoutFeedback, Keyboard, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Link, router } from 'expo-router'
import authStore from '../../store/authStore'
import { API_BASE_URL } from '../../config/api'

export default function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState({})
    
    const { setToken, setUserData } = authStore()

    const validateForm = () => {
        const newErrors = {}
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

        if (!email) {
            newErrors.email = 'Email is required'
        } else if (!emailRegex.test(email)) {
            newErrors.email = 'Invalid email format'
        }

        if (!password) {
            newErrors.password = 'Password is required'
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleLogin = async () => {
        if (!validateForm()) {
            return
        }

        setLoading(true)
        try {
            // Create FormData as expected by backend
            const formData = new FormData()
            formData.append('username', email.toLowerCase().trim())
            formData.append('password', password)

            const response = await fetch(`${API_BASE_URL}/auth/token`, {
                method: 'POST',
                body: formData,
            })

            if (response.status === 200) {
                const data = await response.json()
                
                // Save token to auth store and AsyncStorage
                await setToken(data.access_token)

                // Fetch user data from /me endpoint
                const meResponse = await fetch(`${API_BASE_URL}/me`, {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${data.access_token}`,
                        'Content-Type': 'application/json',
                    },
                })

                if (meResponse.ok) {
                    const userData = await meResponse.json()
                    await setUserData(userData)
                    
                    // Navigate to dashboard
                    router.replace('/(dashboard)/caddie')
                } else {
                    setErrors({ server: 'Failed to load user data' })
                }
            } else if (response.status === 400 || response.status === 401) {
                setErrors({ server: 'Invalid email or password' })
            } else {
                setErrors({ server: 'Login failed. Please try again later.' })
            }
        } catch (error) {
            console.error('Login error:', error)
            setErrors({ server: 'An unexpected error occurred' })
        } finally {
            setLoading(false)
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
                            <View className="w-20 h-20 bg-green-500 rounded-full items-center justify-center mb-6 shadow-lg">
                                <Text className="text-white text-2xl font-bold">SC</Text>
                            </View>
                            <Text className="text-4xl font-bold text-gray-900 mb-3">
                                Welcome Back
                            </Text>
                            <Text className="text-lg text-gray-500 text-center">
                                Sign in to continue your golf journey
                            </Text>
                        </View>

                        {/* Form */}
                        <View className="space-y-4">
                            <View>
                                <Text className="text-gray-700 mb-2 font-semibold">Email Address</Text>
                                <TextInput
                                    className="bg-white border border-gray-200 p-4 rounded-xl"
                                    value={email}
                                    onChangeText={(text) => {
                                        setEmail(text)
                                        setErrors({})
                                    }}
                                    placeholder="Enter your email"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoComplete="email"
                                />
                                {errors.email && (
                                    <Text className="text-red-500 mt-1">{errors.email}</Text>
                                )}
                            </View>

                            <View>
                                <Text className="text-gray-700 mb-2 font-semibold">Password</Text>
                                <TextInput
                                    className="bg-white border border-gray-200 p-4 rounded-xl"
                                    value={password}
                                    onChangeText={(text) => {
                                        setPassword(text)
                                        setErrors({})
                                    }}
                                    placeholder="Enter your password"
                                    secureTextEntry
                                />
                                {errors.password && (
                                    <Text className="text-red-500 mt-1">{errors.password}</Text>
                                )}
                            </View>

                            {errors.server && (
                                <Text className="text-red-500 text-center mt-2">{errors.server}</Text>
                            )}

                            <TouchableOpacity
                                className={`bg-green-500 py-4 rounded-xl mt-6 ${loading ? 'opacity-70' : ''}`}
                                onPress={handleLogin}
                                disabled={loading}
                            >
                                <Text className="text-white text-center text-lg font-bold">
                                    {loading ? 'Signing In...' : 'Sign In'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Footer */}
                        <View className="items-center mt-10">
                            <Text className="text-gray-500 text-base">
                                Don't have an account?{' '}
                                <Link href="/register" className="text-green-500 font-bold">
                                    Sign up
                                </Link>
                            </Text>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </TouchableWithoutFeedback>
    )
}
