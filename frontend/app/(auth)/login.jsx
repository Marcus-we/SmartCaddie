import { useState } from 'react'
import { Text, View, TextInput, TouchableOpacity, Alert, TouchableWithoutFeedback, Keyboard, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Link, useRouter } from 'expo-router'
import authStore from '../../store/authStore'


const API_URL = 'http://192.168.0.129:8000/v1'; // Local network IP

export default function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [emailError, setEmailError] = useState('')
    const [passwordError, setPasswordError] = useState('')
    const [serverError, setServerError] = useState('')
    
    const router = useRouter()
    const { setToken, setUserData } = authStore()

    const validateEmail = () => {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!email) {
            setEmailError('Email address is required')
            return false
        } else if (!regex.test(email)) {
            setEmailError('Please enter a valid email address')
            return false
        } else {
            setEmailError('')
            return true
        }
    }

    const validatePassword = () => {
        if (!password) {
            setPasswordError('Password is required')
            return false
        } else {
            setPasswordError('')
            return true
        }
    }

    const handleLogin = async () => {
        setServerError('')
        const isEmailValid = validateEmail()
        const isPasswordValid = validatePassword()

        if (!isEmailValid || !isPasswordValid) {
            return
        }

        setLoading(true)
        try {
            // Create FormData as expected by your backend
            const formData = new FormData()
            formData.append('username', email) // Backend expects 'username' field
            formData.append('password', password)

            const response = await fetch(`${API_URL}/auth/token`, {
                method: 'POST',
                body: formData,
            })

            if (response.status === 200) {
                const data = await response.json()
                
                // Save token to auth store and AsyncStorage
                await setToken(data.access_token)

                // Fetch user data from /me endpoint
                const meResponse = await fetch(`${API_URL}/me`, {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${data.access_token}`,
                        'Content-Type': 'application/json',
                    },
                })

                if (meResponse.ok) {
                    const userData = await meResponse.json()
                    await setUserData(userData)
                    console.log('Login successful:', userData)
                    
                    // Navigate to dashboard
                    router.replace('/(dashboard)/caddie')
                } else {
                    console.error('Failed to fetch user data')
                    setServerError('Login successful but failed to load user data')
                }
            } else if (response.status === 400 || response.status === 401) {
                setServerError('Invalid email or password. Please try again.')
            } else {
                setServerError('Login failed. Please try again later.')
            }
        } catch (error) {
            console.error('Login error:', error)
            setServerError('An unexpected error occurred. Please try again later.')
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
                        <View className="items-center mb-12">
                            <View className="w-20 h-20 bg-green-600 rounded-full items-center justify-center mb-6 shadow-lg">
                                <Text className="text-white text-2xl font-bold">SC</Text>
                            </View>
                            <Text className="text-4xl font-bold text-green-900 mb-3">
                                Welcome Back
                            </Text>
                            <Text className="text-lg text-green-700 text-center leading-6">
                                Sign in to continue your golf journey
                            </Text>
                        </View>

                        {/* Form */}
                        <View className="space-y-6">
                            <View>
                                <Text className="text-green-800 mb-3 font-semibold text-base">Email Address</Text>
                                <TextInput
                                    className="bg-white border border-green-200 p-5 rounded-2xl text-base shadow-sm"
                                    placeholder="Enter your email"
                                    placeholderTextColor="#6B7280"
                                    value={email}
                                    onChangeText={setEmail}
                                    onBlur={validateEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                                {emailError ? <Text className="mt-2 text-sm text-red-600">{emailError}</Text> : null}
                            </View>

                            <View>
                                <Text className="text-green-800 mb-3 font-semibold text-base">Password</Text>
                                <TextInput
                                    className="bg-white border border-green-200 p-5 rounded-2xl text-base shadow-sm"
                                    placeholder="Enter your password"
                                    placeholderTextColor="#6B7280"
                                    value={password}
                                    onChangeText={setPassword}
                                    onBlur={validatePassword}
                                    secureTextEntry
                                />
                                {passwordError ? <Text className="mt-2 text-sm text-red-600">{passwordError}</Text> : null}
                            </View>

                            {/* Server Error */}
                            {serverError ? (
                                <View className="my-2">
                                    <Text className="text-sm text-red-600">{serverError}</Text>
                                </View>
                            ) : null}

                            <TouchableOpacity 
                                className={`py-5 rounded-2xl mt-8 shadow-lg ${loading ? 'bg-green-400' : 'bg-green-600'}`}
                                onPress={handleLogin}
                                disabled={loading}
                                style={{
                                    shadowColor: '#059669',
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.3,
                                    shadowRadius: 8,
                                    elevation: 8,
                                }}
                            >
                                <Text className="text-white text-center text-lg font-bold">
                                    {loading ? 'Signing In...' : 'Sign In'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Footer */}
                        <View className="items-center mt-12">
                            <Text className="text-green-600 text-base">
                                Don't have an account?{' '}
                                <Link href="/register" className="text-green-700 font-bold">
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
