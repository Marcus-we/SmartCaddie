import { Text, View, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Link } from 'expo-router'

function Home() {
    return (
        <SafeAreaView className="flex-1 bg-green-50">
            <View className="flex-1 justify-center items-center px-6">
                {/* Main Title */}
                <View className="items-center mb-20">
                    <View className="w-24 h-24 bg-green-600 rounded-full items-center justify-center mb-8 shadow-xl">
                        <Text className="text-white text-3xl font-bold">SC</Text>
                    </View>
                    <Text className="text-5xl font-bold text-green-900 mb-4">
                        SmartCaddie
                    </Text>
                    <Text className="text-lg text-green-700 text-center">
                        Your AI-powered golf companion
                    </Text>
                </View>
            </View>

            {/* Bottom Buttons */}
            <View className="px-6 pb-8 space-y-4">
                <Link href="/login" asChild>
                    <TouchableOpacity 
                        className="bg-green-600 py-4 rounded-2xl shadow-lg"
                        style={{
                            shadowColor: '#059669',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.3,
                            shadowRadius: 8,
                            elevation: 8,
                        }}
                    >
                        <Text className="text-white text-center text-lg font-bold">
                            Login
                        </Text>
                    </TouchableOpacity>
                </Link>

                <Link href="/register" asChild>
                    <TouchableOpacity className="bg-white py-4 rounded-2xl border-2 border-green-600 shadow-sm">
                        <Text className="text-green-700 text-center text-lg font-bold">
                            Join the Club
                        </Text>
                    </TouchableOpacity>
                </Link>
            </View>
        </SafeAreaView>
    )
}

export default Home

