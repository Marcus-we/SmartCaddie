import { useState } from 'react'
import { Text, View, TextInput, TouchableOpacity, Alert, TouchableWithoutFeedback, Keyboard, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Link, useRouter } from 'expo-router'
import '../../global.css'
import authStore from '../../store/authStore'

export default function Register() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleRegister = async () => {
        if (!email || !password || !confirmPassword) {
            Alert.alert('Error', 'Please fill in all fields')
            return
        }

        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match')
            return
        }

        if (password.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters long')
            return
        }

        setLoading(true)
        try {
            // TODO: Implement register logic with your auth store
            console.log('Register attempt:', { email, password })
            
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000))
            
            // On success, navigate to dashboard
            router.replace('/(dashboard)/caddie')
        } catch (error) {
            Alert.alert('Registration Failed', error.message || 'Something went wrong')
        } finally {
            setLoading(false)
        }
    }

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <SafeAreaView className="flex-1 bg-gray-50">
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
                                Create Account
                            </Text>
                            <Text className="text-lg text-gray-500 text-center leading-6">
                                Join SmartCaddie and elevate your game
                            </Text>
                        </View>

                        {/* Form */}
                        <View className="space-y-5">
                            <View>
                                <Text className="text-gray-700 mb-3 font-semibold text-base">Email Address</Text>
                                <TextInput
                                    className="bg-white border border-gray-200 p-5 rounded-2xl text-base shadow-sm"
                                    placeholder="Enter your email"
                                    placeholderTextColor="#9CA3AF"
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                            </View>

                            <View>
                                <Text className="text-gray-700 mb-3 font-semibold text-base">Password</Text>
                                <TextInput
                                    className="bg-white border border-gray-200 p-5 rounded-2xl text-base shadow-sm"
                                    placeholder="Enter your password"
                                    placeholderTextColor="#9CA3AF"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry
                                />
                            </View>

                            <View>
                                <Text className="text-gray-700 mb-3 font-semibold text-base">Confirm Password</Text>
                                <TextInput
                                    className="bg-white border border-gray-200 p-5 rounded-2xl text-base shadow-sm"
                                    placeholder="Confirm your password"
                                    placeholderTextColor="#9CA3AF"
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    secureTextEntry
                                />
                            </View>

                            <TouchableOpacity 
                                className={`py-5 rounded-2xl mt-8 shadow-lg ${loading ? 'bg-green-300' : 'bg-green-500'}`}
                                onPress={handleRegister}
                                disabled={loading}
                                style={{
                                    shadowColor: '#10B981',
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.3,
                                    shadowRadius: 8,
                                    elevation: 8,
                                }}
                            >
                                <Text className="text-white text-center text-lg font-bold">
                                    {loading ? 'Creating Account...' : 'Create Account'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Footer */}
                        <View className="items-center mt-10">
                            <Text className="text-gray-500 text-base">
                                Already have an account?{' '}
                                <Link href="/login" className="text-green-500 font-bold">
                                    Sign in
                                </Link>
                            </Text>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </TouchableWithoutFeedback>
    )
}
