import { useState } from 'react'
import { Text, View, TouchableOpacity, ScrollView, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Link, router } from 'expo-router'
import authStore from '../../store/authStore'
import { formatHandicapIndex } from '../utils/formatters'

export default function Profile() {
    const { userData, logout } = authStore()

    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Logout', 
                    style: 'destructive', 
                    onPress: async () => {
                        try {
                            await logout();
                            // The logout function will handle the redirect to homepage
                        } catch (error) {
                            console.error('Logout error:', error);
                            Alert.alert('Error', 'Failed to logout properly. Please try again.');
                        }
                    }
                }
            ]
        )
    }

    const ProfileSection = ({ title, children }) => (
        <View className="mb-6">
            <Text className="text-lg font-bold text-green-900 mb-3 px-6">
                {title}
            </Text>
            <View className="bg-white mx-6 rounded-2xl shadow-sm">
                {children}
            </View>
        </View>
    )

    const ProfileItem = ({ icon, title, subtitle, onPress, showArrow = true, color = "#059669", href }) => (
        href ? (
            <Link href={href} asChild>
                <TouchableOpacity className="flex-row items-center p-4 border-b border-gray-100 last:border-b-0">
                    <View className="w-10 h-10 bg-green-100 rounded-full items-center justify-center mr-4">
                        <Ionicons name={icon} size={20} color={color} />
                    </View>
                    <View className="flex-1">
                        <Text className="text-gray-900 font-semibold">{title}</Text>
                        {subtitle && (
                            <Text className="text-gray-500 text-sm mt-1">{subtitle}</Text>
                        )}
                    </View>
                    {showArrow && (
                        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                    )}
                </TouchableOpacity>
            </Link>
        ) : (
            <TouchableOpacity 
                onPress={onPress}
                className="flex-row items-center p-4 border-b border-gray-100 last:border-b-0"
            >
                <View className="w-10 h-10 bg-green-100 rounded-full items-center justify-center mr-4">
                    <Ionicons name={icon} size={20} color={color} />
                </View>
                <View className="flex-1">
                    <Text className="text-gray-900 font-semibold">{title}</Text>
                    {subtitle && (
                        <Text className="text-gray-500 text-sm mt-1">{subtitle}</Text>
                    )}
                </View>
                {showArrow && (
                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                )}
            </TouchableOpacity>
        )
    )

    return (
        <SafeAreaView className="flex-1 bg-green-50" edges={['top']}>
            <ScrollView className="flex-1">
                {/* Header */}
                <View className="px-6 pt-4 pb-6">
                    <Text className="text-3xl font-bold text-green-900 mb-2">
                        Profile
                    </Text>
                    <Text className="text-green-700">
                        Manage your account and preferences
                    </Text>
                </View>

                {/* User Info Card */}
                <View className="px-6 mb-6">
                    <View className="bg-white rounded-2xl p-6 shadow-sm">
                        <View className="items-center">
                            <View className="w-20 h-20 bg-green-600 rounded-full items-center justify-center mb-4">
                                <Text className="text-white text-2xl font-bold">
                                    {userData?.first_name?.[0]?.toUpperCase() || 'G'}
                                    {userData?.last_name?.[0]?.toUpperCase() || 'U'}
                                </Text>
                            </View>
                            <Text className="text-xl font-bold text-gray-900">
                                {userData?.first_name} {userData?.last_name}
                            </Text>
                            <Text className="text-gray-600 mt-1">
                                {userData?.email}
                            </Text>
                            <View className="flex-row items-center mt-3">
                                <View className="w-3 h-3 bg-green-500 rounded-full mr-2" />
                                <Text className="text-green-600 font-semibold">Active Member</Text>
                            </View>
                            {userData?.handicap_index !== null && (
                                <View className="mt-4 items-center">
                                    <Text className="text-3xl font-bold text-green-700">
                                        {formatHandicapIndex(userData.handicap_index)}
                                    </Text>
                                    <Text className="text-gray-600 text-sm">Handicap</Text>
                                    {userData?.last_handicap_update && (
                                        <Text className="text-gray-500 text-xs mt-1">
                                            Last updated: {new Date(userData.last_handicap_update).toLocaleDateString()}
                                        </Text>
                                    )}
                                </View>
                            )}
                        </View>
                    </View>
                </View>

                {/* Account Settings */}
                <ProfileSection title="Account">
                    <ProfileItem
                        icon="person-outline"
                        title="Edit Profile"
                        subtitle="Update your personal information"
                        href="/(dashboard)/edit-profile"
                    />
                    <ProfileItem
                        icon="lock-closed-outline"
                        title="Change Password"
                        subtitle="Update your account password"
                        href="/(dashboard)/change-password"
                    />
                    <ProfileItem
                        icon="notifications-outline"
                        title="Notifications"
                        subtitle="Manage your notification preferences"
                        onPress={() => Alert.alert('Coming Soon', 'Notification settings will be available soon!')}
                    />
                </ProfileSection>

                {/* Golf Settings */}
                <ProfileSection title="Golf Settings">
                    <ProfileItem
                        icon="play-circle-outline"
                        title="Start New Round"
                        subtitle="Begin tracking a new golf round"
                        href="/(dashboard)/start-round"
                        color="#059669"
                    />
                    <ProfileItem
                        icon="golf-outline"
                        title="My Clubs"
                        subtitle="Manage your golf club set"
                        href="/(dashboard)/my-clubs"
                    />
                    <ProfileItem
                        icon="list-outline"
                        title="Round History"
                        subtitle="View your completed rounds"
                        href="/(dashboard)/round-history"
                    />
                </ProfileSection>

                {/* App Settings */}
                <ProfileSection title="App Settings">
                    <ProfileItem
                        icon="settings-outline"
                        title="Preferences"
                        subtitle="App settings and preferences"
                        onPress={() => Alert.alert('Coming Soon', 'App preferences will be available soon!')}
                    />
                    <ProfileItem
                        icon="help-circle-outline"
                        title="Help & Support"
                        subtitle="Get help and contact support"
                        onPress={() => Alert.alert('Coming Soon', 'Help section will be available soon!')}
                    />
                    <ProfileItem
                        icon="information-circle-outline"
                        title="About"
                        subtitle="App version and information"
                        onPress={() => Alert.alert('SmartCaddie', 'Version 1.0.0\nYour AI-powered golf companion')}
                    />
                </ProfileSection>

                {/* Logout */}
                <View className="px-6 mb-8">
                    <TouchableOpacity 
                        onPress={handleLogout}
                        className="bg-red-500 rounded-2xl p-4 shadow-sm"
                    >
                        <View className="flex-row items-center justify-center">
                            <Ionicons name="log-out-outline" size={20} color="white" />
                            <Text className="text-white font-bold ml-2">
                                Logout
                            </Text>
                        </View>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    )
}
