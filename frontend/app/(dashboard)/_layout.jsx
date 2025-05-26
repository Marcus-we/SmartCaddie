import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import '../../global.css'

export default function DashboardLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: '#059669', // Green-600
                tabBarInactiveTintColor: '#6B7280', // Gray-500
                tabBarStyle: {
                    backgroundColor: '#FFFFFF',
                    borderTopWidth: 1,
                    borderTopColor: '#E5E7EB',
                    paddingBottom: 8,
                    paddingTop: 8,
                    height: 80,
                },
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: '600',
                    marginTop: 4,
                },
            }}
        >
            <Tabs.Screen
                name="caddie"
                options={{
                    title: 'Smart Caddie',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="golf" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="stats"
                options={{
                    title: 'Stats',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="analytics" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="person" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="my-clubs"
                options={{
                    href: null, // This hides the screen from the tab bar
                }}
            />
            <Tabs.Screen
                name="edit-profile"
                options={{
                    href: null, // This hides the screen from the tab bar
                }}
            />
            <Tabs.Screen
                name="change-password"
                options={{
                    href: null, // This hides the screen from the tab bar
                }}
            />
            <Tabs.Screen
                name="start-round"
                options={{
                    href: null, // This hides the screen from the tab bar
                }}
            />
            <Tabs.Screen
                name="round-history"
                options={{
                    href: null, // This hides the screen from the tab bar
                }}
            />
        </Tabs>
    )
}
