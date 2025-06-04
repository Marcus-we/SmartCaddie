import { useState, useEffect, useCallback } from 'react'
import { Text, View, TouchableOpacity, Alert, ActivityIndicator, Dimensions, Modal, ScrollView, TextInput, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import MapView, { Marker, Polyline } from 'react-native-maps'
import * as Location from 'expo-location'
import { router } from 'expo-router'
import authStore from '../../store/authStore'
import useRoundStore from '../../store/roundStore'
import { API_BASE_URL } from '../../config/api'
import { formatHandicapIndex } from '../utils/formatters'

const { width, height } = Dimensions.get('window')

export default function SmartCaddie() {
    const { userData, token } = authStore()
    const { 
        currentRound, 
        currentHole, 
        getCurrentHoleShots, 
        getCurrentHolePar,
        getTotalShots,
        getScoreRelativeToPar,
        updateHoleScore,
        nextHole,
        previousHole,
        setCurrentHole,
        getActiveRound,
        completeRound,
        reset,
        deleteRound
    } = useRoundStore()
    
    // Location and Map State
    const [playerPosition, setPlayerPosition] = useState(null)
    const [targetPosition, setTargetPosition] = useState(null)
    const [distance, setDistance] = useState(0)
    const [mapRegion, setMapRegion] = useState(null)
    const [mapType, setMapType] = useState('satellite') // 'satellite' or 'standard'
    
    // Weather State
    const [weather, setWeather] = useState(null)
    const [weatherLoading, setWeatherLoading] = useState(false)
    
    // Device Orientation State
    const [deviceHeading, setDeviceHeading] = useState(0)
    const [headingSubscription, setHeadingSubscription] = useState(null)
    
    // Shot Conditions State
    const [showConditionsModal, setShowConditionsModal] = useState(false)
    const [conditionsModalShown, setConditionsModalShown] = useState(false)
    const [shotConditions, setShotConditions] = useState({
        // Surface type conditions (only one can be selected)
        fairway: true,
        light_rough: false,
        heavy_rough: false,
        hardpan: false,
        divot: false,
        bunker: false,
        
        // Slope direction conditions (uphill/downhill - only one can be selected)
        uphill: false,
        downhill: false,
        
        // Ball position relative to feet (above/below - only one can be selected)
        ball_above_feet: false,
        ball_below_feet: false,
        
        // Ground conditions (only one can be selected)
        wet_ground: false,
        firm_ground: false
    })
    
    // Feedback State
    const [showFeedbackModal, setShowFeedbackModal] = useState(false)
    const [feedbackData, setFeedbackData] = useState({
        liked: null,
        club_used: '',
        shot_result: ''
    })
    const [feedbackLoading, setFeedbackLoading] = useState(false)
    
    // UI State
    const [locationLoading, setLocationLoading] = useState(true)
    const [recommendation, setRecommendation] = useState(null)
    const [recommendationLoading, setRecommendationLoading] = useState(false)
    
    // Shot Counter State
    const [currentShots, setCurrentShots] = useState(0)
    const [showShotModal, setShowShotModal] = useState(false)
    
    // Round Completion State
    const [showCompleteRoundModal, setShowCompleteRoundModal] = useState(false)
    const [roundNotes, setRoundNotes] = useState('')
    const [completingRound, setCompletingRound] = useState(false)

    // Get current location on component mount
    useEffect(() => {
        getCurrentLocation()
        startHeadingUpdates()
        loadActiveRound()
        
        // Cleanup on unmount
        return () => {
            if (headingSubscription) {
                headingSubscription.remove()
            }
        }
    }, [])
    
    // Sync shot counter with current hole data
    useEffect(() => {
        if (currentRound) {
            setCurrentShots(getCurrentHoleShots())
        }
    }, [currentRound, currentHole])

    // Get weather data when player position changes
    useEffect(() => {
        if (playerPosition) {
            getWeatherData(playerPosition.latitude, playerPosition.longitude)
        }
    }, [playerPosition])

    const loadActiveRound = async () => {
        try {
            await getActiveRound()
        } catch (error) {
            console.error('Error loading active round:', error)
        }
    }

    const addShot = () => {
        setCurrentShots(prev => prev + 1)
    }

    const removeShot = () => {
        if (currentShots > 0) {
            setCurrentShots(prev => prev - 1)
        }
    }

    const saveHoleScore = async () => {
        if (!currentRound) {
            Alert.alert('No Active Round', 'Please start a round first.')
            return
        }

        if (currentShots === 0) {
            Alert.alert('No Shots', 'Please add at least one shot before saving.')
            return
        }

        try {
            await updateHoleScore(currentHole, currentShots, getCurrentHolePar())
            // Score saved successfully - no popup needed
        } catch (error) {
            Alert.alert('Error', 'Failed to save score: ' + error.message)
        }
    }

    const handleNextHole = () => {
        if (currentRound && currentHole < currentRound.total_holes) {
            nextHole()
            setCurrentShots(0) // Reset for next hole
        }
    }

    const handlePreviousHole = () => {
        if (currentHole > 1) {
            previousHole()
        }
    }

    const toggleMapType = () => {
        setMapType(prev => prev === 'satellite' ? 'standard' : 'satellite')
    }

    const handleCompleteRound = async () => {
        if (!currentRound) {
            Alert.alert('No Active Round', 'Please start a round first.')
            return
        }

        try {
            setCompletingRound(true)
            
            const completedRound = await completeRound(roundNotes.trim() || null)
            const { userData } = authStore.getState()
            
            // Show completion message with handicap update if available
            const message = completedRound.score_differential !== null
                ? `Your round at ${currentRound.course_name} has been completed and saved.`
                : `Your round at ${currentRound.course_name} has been completed and saved.`
            
            Alert.alert(
                'Round Completed!',
                message,
                [
                    {
                        text: 'View History',
                        onPress: () => {
                            setShowCompleteRoundModal(false)
                            setRoundNotes('')
                            router.push('/(dashboard)/round-history')
                        }
                    },
                    {
                        text: 'OK',
                        onPress: () => {
                            setShowCompleteRoundModal(false)
                            setRoundNotes('')
                        }
                    }
                ]
            )
        } catch (error) {
            Alert.alert('Error', 'Failed to complete round: ' + error.message)
        } finally {
            setCompletingRound(false)
        }
    }

    const confirmCompleteRound = () => {
        if (!currentRound) return

        // Check if any shots have been recorded
        const totalShots = getTotalShots()
        if (totalShots === 0) {
            Alert.alert(
                'No Shots Recorded',
                'You cannot complete a round without recording any shots. Please record at least one shot before completing the round.',
                [{ text: 'OK' }]
            )
            return
        }

        // Check if all holes have been played
        const unplayedHoles = currentRound.hole_scores.filter(hole => hole.shots === 0)
        
        if (unplayedHoles.length > 0) {
            Alert.alert(
                'Incomplete Round',
                `You have ${unplayedHoles.length} hole(s) with no shots recorded. If you complete the round now, it will not count towards your handicap calculation. Would you like to continue?`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    { 
                        text: 'Complete Anyway', 
                        style: 'destructive',
                        onPress: () => setShowCompleteRoundModal(true)
                    }
                ]
            )
        } else {
            setShowCompleteRoundModal(true)
        }
    }

    const getCurrentLocation = async () => {
        try {
            setLocationLoading(true)
            
            // Request permission
            const { status } = await Location.requestForegroundPermissionsAsync()
            if (status !== 'granted') {
                Alert.alert(
                    'Location Permission Required',
                    'This app needs location access to provide accurate yardages and recommendations.',
                    [{ text: 'OK' }]
                )
                return
            }

            // Get current position with high accuracy
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.BestForNavigation,
                timeout: 10000,
            })

            const position = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            }

            setPlayerPosition(position)
            setMapRegion({
                ...position,
                latitudeDelta: 0.005, // Zoom level for golf course view
                longitudeDelta: 0.005,
            })

        } catch (error) {
            console.error('Error getting location:', error)
            Alert.alert('Location Error', 'Unable to get your current location. Please try again.')
        } finally {
            setLocationLoading(false)
        }
    }

    const getWeatherData = async (latitude, longitude) => {
        try {
            setWeatherLoading(true)
            
            const url = `https://api.open-meteo.com/v1/forecast?` +
                `latitude=${latitude}&longitude=${longitude}&` +
                `current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m&` +
                `wind_speed_unit=ms&` +
                `temperature_unit=celsius&` +
                `timezone=auto`

            const response = await fetch(url)
            const data = await response.json()
            
            setWeather({
                temperature: Math.round(data.current.temperature_2m),
                windSpeed: Math.round(data.current.wind_speed_10m * 10) / 10, // Round to 1 decimal place
                windDirection: data.current.wind_direction_10m,
                windGusts: Math.round((data.current.wind_gusts_10m || 0) * 10) / 10, // Round to 1 decimal place
                humidity: data.current.relative_humidity_2m
            })

        } catch (error) {
            console.error('Error fetching weather:', error)
        } finally {
            setWeatherLoading(false)
        }
    }

    const startHeadingUpdates = async () => {
        try {
            // Request permission for location (needed for compass)
            const { status } = await Location.requestForegroundPermissionsAsync()
            if (status !== 'granted') {
                console.log('Location permission not granted for compass')
                return
            }

            // Check if device has compass
            const hasCompass = await Location.hasServicesEnabledAsync()
            if (!hasCompass) {
                console.log('Device does not have compass capabilities')
                return
            }

            // Start watching heading changes
            const subscription = await Location.watchHeadingAsync((headingData) => {
                // headingData.trueHeading gives us the direction the device is pointing
                // in degrees from true north (0-360)
                setDeviceHeading(headingData.trueHeading || headingData.magHeading || 0)
            })

            setHeadingSubscription(subscription)

        } catch (error) {
            console.error('Error starting heading updates:', error)
        }
    }

    const calculateDistance = (point1, point2) => {
        const R = 6371e3 // Earth's radius in meters
        const φ1 = point1.latitude * Math.PI/180
        const φ2 = point2.latitude * Math.PI/180
        const Δφ = (point2.latitude - point1.latitude) * Math.PI/180
        const Δλ = (point2.longitude - point1.longitude) * Math.PI/180

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2)
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))

        const distanceMeters = R * c
        return Math.round(distanceMeters) // Return meters directly
    }

    const getWindDirection = (degrees) => {
        const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
        const index = Math.round(degrees / 22.5) % 16
        return directions[index]
    }

    // Calculate wind direction relative to device heading
    const getRelativeWindDirection = () => {
        if (!weather || !weather.windDirection) return 0
        
        // Wind direction is where wind is coming FROM
        // But we want to show where wind is blowing TO (opposite direction)
        // Device heading is where device is pointing TO
        // We want to show wind flow direction relative to device orientation
        const windBlowingTo = (weather.windDirection + 180) % 360 // Opposite of where it's coming from
        let relativeDirection = windBlowingTo - deviceHeading
        
        // Normalize to 0-360 range
        if (relativeDirection < 0) relativeDirection += 360
        if (relativeDirection >= 360) relativeDirection -= 360
        
        return relativeDirection
    }

    // Calculate bearing from player to target
    const calculateBearing = (point1, point2) => {
        const lat1 = point1.latitude * Math.PI / 180
        const lat2 = point2.latitude * Math.PI / 180
        const deltaLon = (point2.longitude - point1.longitude) * Math.PI / 180

        const y = Math.sin(deltaLon) * Math.cos(lat2)
        const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon)

        let bearing = Math.atan2(y, x) * 180 / Math.PI
        
        // Normalize to 0-360 range
        bearing = (bearing + 360) % 360
        
        return bearing
    }

    // Calculate wind direction relative to shot direction for backend
    const getWindDirectionForShot = () => {
        if (!weather || !weather.windDirection || !playerPosition || !targetPosition) {
            return 'headwind' // Default fallback
        }

        // Calculate the bearing from player to target (shot direction)
        const shotBearing = calculateBearing(playerPosition, targetPosition)
        
        // Wind direction is where wind is coming FROM
        // Shot bearing is where we're shooting TO
        // Calculate the angle between wind source and shot direction
        let windAngle = weather.windDirection - shotBearing
        
        // Normalize to -180 to 180 range for easier calculation
        while (windAngle > 180) windAngle -= 360
        while (windAngle < -180) windAngle += 360
        
        // Determine wind type based on angle
        const absAngle = Math.abs(windAngle)
        
        let windType
        if (absAngle <= 45) {
            // Wind is coming from the same direction we're shooting (0° ± 45°) - headwind
            windType = 'headwind'
        } else if (absAngle >= 135) {
            // Wind is coming from opposite direction we're shooting (180° ± 45°) - tailwind  
            windType = 'tailwind'
        } else if (windAngle > 0) {
            // Wind is coming from the right side relative to shot direction (45° to 135°)
            windType = 'crosswind-right'
        } else {
            // Wind is coming from the left side relative to shot direction (-45° to -135°)
            windType = 'crosswind-left'
        }

        return windType
    }

    // Wind Arrow Component
    const WindArrow = () => {
        if (!weather || !playerPosition || weather.windSpeed < 1) return null
        
        const relativeDirection = getRelativeWindDirection()
        
        return (
            <Marker
                coordinate={playerPosition}
                anchor={{ x: 0.5, y: 0.5 }}
                zIndex={1000}
            >
                <View 
                    style={{
                        width: 60,
                        height: 60,
                        alignItems: 'center',
                        justifyContent: 'center',
                        transform: [{ rotate: `${relativeDirection}deg` }]
                    }}
                >
                    {/* Wind Arrow */}
                    <View
                        style={{
                            width: 40,
                            height: 40,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Ionicons 
                            name="arrow-up" 
                            size={32} 
                            color="#FF6B35"
                            style={{
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.8,
                                shadowRadius: 3,
                            }}
                        />
                    </View>
                    
                    {/* Wind Speed Label */}
                    <View
                        style={{
                            position: 'absolute',
                            bottom: -8,
                            backgroundColor: 'rgba(255, 107, 53, 0.9)',
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderRadius: 8,
                            minWidth: 35,
                            alignItems: 'center',
                        }}
                    >
                        <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>
                            {weather.windSpeed}m/s
                        </Text>
                    </View>
                </View>
            </Marker>
        )
    }

    const handleMapPress = (event) => {
        if (!playerPosition) return

        const target = event.nativeEvent.coordinate
        setTargetPosition(target)
        
        const dist = calculateDistance(playerPosition, target)
        setDistance(dist)
        
        // Clear previous recommendation
        setRecommendation(null)
        
        // Show conditions modal after a short delay, but only if not shown for this shot yet
        if (!conditionsModalShown) {
            setTimeout(() => {
                setShowConditionsModal(true)
                setConditionsModalShown(true)
            }, 800)
        }
    }

    // Helper function to handle surface condition selection (only one can be active)
    const handleSurfaceCondition = (condition) => {
        setShotConditions(prev => ({
            ...prev,
            // Reset all surface conditions
            fairway: false,
            light_rough: false,
            heavy_rough: false,
            hardpan: false,
            divot: false,
            bunker: false,
            // Set the selected one to true
            [condition]: true
        }))
    }

    // Helper function to handle slope direction conditions (uphill/downhill - only one can be active)
    const handleSlopeDirectionCondition = (condition) => {
        setShotConditions(prev => ({
            ...prev,
            // Reset slope direction conditions
            uphill: false,
            downhill: false,
            // Set the selected one to true, or false if it was already selected (to deselect)
            [condition]: prev[condition] ? false : true
        }))
    }

    // Helper function to handle ball position relative to feet (above/below - only one can be active)
    const handleBallPositionCondition = (condition) => {
        setShotConditions(prev => ({
            ...prev,
            // Reset ball position conditions
            ball_above_feet: false,
            ball_below_feet: false,
            // Set the selected one to true, or false if it was already selected (to deselect)
            [condition]: prev[condition] ? false : true
        }))
    }

    // Helper function to handle ground conditions (only one can be active)
    const handleGroundCondition = (condition) => {
        setShotConditions(prev => ({
            ...prev,
            // Reset all ground conditions
            wet_ground: false,
            firm_ground: false,
            // Set the selected one to true, or false if it was already selected (to deselect)
            [condition]: prev[condition] ? false : true
        }))
    }

    // Helper function to handle slope/ground conditions (can combine) - DEPRECATED, keeping for backwards compatibility
    const handleToggleCondition = (condition) => {
        setShotConditions(prev => ({
            ...prev,
            [condition]: !prev[condition]
        }))
    }

    // Get active surface condition for display
    const getActiveSurfaceCondition = () => {
        const surfaceConditions = ['fairway', 'light_rough', 'heavy_rough', 'hardpan', 'divot', 'bunker']
        return surfaceConditions.find(condition => shotConditions[condition]) || 'fairway'
    }

    // Get active additional conditions for display
    const getActiveAdditionalConditions = () => {
        const additionalConditions = []
        if (shotConditions.uphill) additionalConditions.push('uphill')
        if (shotConditions.downhill) additionalConditions.push('downhill')
        if (shotConditions.ball_above_feet) additionalConditions.push('ball above feet')
        if (shotConditions.ball_below_feet) additionalConditions.push('ball below feet')
        if (shotConditions.wet_ground) additionalConditions.push('wet ground')
        if (shotConditions.firm_ground) additionalConditions.push('firm ground')
        return additionalConditions
    }

    const getClubRecommendation = async () => {
        if (!distance || !weather) {
            Alert.alert('Missing Data', 'Please select a target and ensure weather data is loaded.')
            return
        }

        try {
            setRecommendationLoading(true)
            
            // Distance is already in meters, wind speed is already in m/s
            
            // Prepare data for your backend API (matching AgentQueryRequest schema)
            const requestData = {
                wind_speed: weather.windSpeed, // Already in m/s
                wind_direction: getWindDirectionForShot(), // Use shot-relative wind direction
                distance_to_flag: distance, // Already in meters
                // Use shot conditions from state
                ...shotConditions
            }

            const response = await fetch(`${API_BASE_URL}/agent/query`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData)
            })

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            const result = await response.json()
            setRecommendation(result)

        } catch (error) {
            console.error('Error getting recommendation:', error)
            Alert.alert('Error', 'Failed to get club recommendation. Please try again.')
        } finally {
            setRecommendationLoading(false)
        }
    }

    const submitFeedback = async () => {
        if (!recommendation || !recommendation.timestamp || feedbackData.liked === null) {
            Alert.alert('Missing Data', 'Please provide a rating (thumbs up/down) for the recommendation.')
            return
        }

        try {
            setFeedbackLoading(true)
            
            const feedbackRequest = {
                timestamp: recommendation.timestamp,
                liked: feedbackData.liked,
                ...(feedbackData.club_used && { club_used: feedbackData.club_used }),
                ...(feedbackData.shot_result && { shot_result: feedbackData.shot_result })
            }

            const response = await fetch(`${API_BASE_URL}/shots/feedback`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(feedbackRequest)
            })

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            const result = await response.json()
            
            // Show success message
            Alert.alert('Feedback Submitted', 'Thank you for your feedback! This helps improve future recommendations.')
            
            // Close modal and clear everything for next shot
            setShowFeedbackModal(false)
            setFeedbackData({
                liked: null,
                club_used: '',
                shot_result: ''
            })
            
            // Clear shot data for next shot
            setTargetPosition(null)
            setDistance(0)
            setRecommendation(null)
            setShowConditionsModal(false)
            setConditionsModalShown(false)

        } catch (error) {
            console.error('Error submitting feedback:', error)
            Alert.alert('Error', 'Failed to submit feedback. Please try again.')
        } finally {
            setFeedbackLoading(false)
        }
    }

    const handleEndRound = () => {
        if (!currentRound) return

        Alert.alert(
            'End Round',
            'Are you sure you want to end this round? Any saved scores will be discarded and this round will not count towards your handicap.',
            [
                {
                    text: 'Cancel',
                    style: 'cancel'
                },
                {
                    text: 'End Round',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            // Delete the round from the database
                            await deleteRound(currentRound.id)
                            // Reset the round store which clears the current round
                            reset()
                            // Navigate back to start round
                            router.push('/(dashboard)/start-round')
                        } catch (error) {
                            Alert.alert('Error', 'Failed to end round: ' + error.message)
                        }
                    }
                }
            ]
        )
    }

    if (locationLoading) {
        return (
            <SafeAreaView className="flex-1 bg-green-50 justify-center items-center" edges={['top']}>
                <ActivityIndicator size="large" color="#059669" />
                <Text className="text-green-900 mt-4 text-lg">Getting your location...</Text>
            </SafeAreaView>
        )
    }

    if (!playerPosition) {
        return (
            <SafeAreaView className="flex-1 bg-green-50 justify-center items-center px-6" edges={['top']}>
                <Ionicons name="location-outline" size={64} color="#9CA3AF" />
                <Text className="text-gray-900 text-xl font-bold mt-4 text-center">
                    Location Required
                </Text>
                <Text className="text-gray-600 mt-2 text-center">
                    Please enable location services to use the smart caddie.
                </Text>
                <TouchableOpacity 
                    onPress={getCurrentLocation}
                    className="bg-green-600 rounded-2xl px-6 py-3 mt-6"
                >
                    <Text className="text-white font-bold">Try Again</Text>
                </TouchableOpacity>
            </SafeAreaView>
        )
    }

    return (
        <SafeAreaView className="flex-1 bg-green-50" edges={['top']}>
            {/* Header with Weather */}
            <View className="px-4 pt-2 pb-3 bg-white shadow-sm">
                <View className="flex-row items-center justify-between">
                    <View>
                        <Text className="text-lg font-bold text-green-900">
                            Smart Caddie
                        </Text>
                        <Text className="text-green-700 text-sm">
                            Tap map to select target
                        </Text>
                    </View>
                    
                    {weather && (
                        <View className="items-end">
                            <View className="flex-row items-center space-x-3">
                                <View className="items-end">
                                    <Text className="text-lg font-bold text-green-600">
                                        {weather.temperature}°C
                                    </Text>
                                    <Text className="text-gray-600 text-sm">
                                        {weather.windSpeed}m/s {getWindDirection(weather.windDirection)}
                                    </Text>
                                </View>
                                
                                {/* Mini Compass */}
                                <View className="items-center justify-center relative pl-2">
                                    <View className="w-12 h-12 items-center justify-center bg-gray-50 rounded-full border border-gray-200 shadow-sm">
                                        <View 
                                            className="w-10 h-10 items-center justify-center"
                                            style={{
                                                transform: [{ rotate: `${getRelativeWindDirection()}deg` }]
                                            }}
                                        >
                                            <Ionicons 
                                                name="arrow-up" 
                                                size={24} 
                                                color="#FF6B35"
                                            />
                                        </View>
                                    </View>
                                    <Text className="text-xs text-gray-500 mt-1 font-medium">
                                        Wind
                                    </Text>
                                </View>
                            </View>
                        </View>
                    )}
                    
                    {weatherLoading && (
                        <ActivityIndicator size="small" color="#059669" />
                    )}
                </View>
                
                {/* Round Info - Highlight Hole and Par */}
                {currentRound ? (
                    <View className="mt-3 pt-3 border-t border-gray-200">
                        <View className="flex-row items-center justify-between mb-3">
                            <Text className="text-md text-gray-600 font-bold">
                                {currentRound.course_name}
                            </Text>
                            <View className="flex-col gap-2">
                                <TouchableOpacity
                                    onPress={() => setShowShotModal(true)}
                                    className="bg-green-600 rounded-xl px-4 py-2"
                                >
                                    <Text className="text-white font-bold text-sm">
                                        Track Score
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={handleEndRound}
                                    className="bg-red-500 rounded-xl px-4 py-2"
                                >
                                    <Text className="text-white font-bold text-sm">
                                        End Round
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                        
                        <View className="bg-green-50 rounded-xl p-3 border border-green-200 w-[25%]">
                            <View className="flex-row items-center space-x-6">
                                <View className="items-center">
                                    <Text className="text-green-700 font-semibold text-xs pr-2">
                                        HOLE
                                    </Text>
                                    <Text className="text-green-900 font-bold text-2xl">
                                        {currentHole}
                                    </Text>
                                </View>
                                
                                <View className="w-px h-10 bg-green-300" />
                                
                                <View className="items-center">
                                    <Text className="text-green-700 font-semibold text-xs pl-2">
                                        PAR
                                    </Text>
                                    <Text className="text-green-900 font-bold text-2xl">
                                        {getCurrentHolePar()}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                ) : (
                    <View className="mt-3 pt-3 border-t border-gray-200">
                        <TouchableOpacity
                            onPress={() => router.push('/(dashboard)/start-round')}
                            className="bg-green-600 rounded-xl px-6 py-3"
                        >
                            <Text className="text-white font-bold text-center">
                                Start Round
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* Map */}
            <View className="flex-1">
                <MapView
                    style={{ width, height: height * 0.6 }}
                    region={mapRegion}
                    onPress={handleMapPress}
                    showsUserLocation={false} // We'll use custom marker
                    showsMyLocationButton={false}
                    mapType={mapType} // Toggle between satellite and standard
                >
                    {/* Wind Direction Arrow */}
                    <WindArrow />

                    {/* Player Position */}
                    {playerPosition && (
                        <Marker
                            coordinate={playerPosition}
                            title="Your Position"
                            pinColor="blue"
                            zIndex={500}
                        >
                            <View className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white" />
                        </Marker>
                    )}

                    {/* Target Position */}
                    {targetPosition && (
                        <Marker
                            coordinate={targetPosition}
                            title={`Target (${distance} meters)`}
                            pinColor="red"
                        >
                            <View className="w-4 h-4 bg-red-500 rounded-full border-2 border-white" />
                        </Marker>
                    )}

                    {/* Distance Line */}
                    {playerPosition && targetPosition && (
                        <Polyline
                            coordinates={[playerPosition, targetPosition]}
                            strokeColor="#059669"
                            strokeWidth={3}
                            lineDashPattern={[5, 5]}
                        />
                    )}
                </MapView>
            </View>

            {/* Bottom Panel */}
            <View className="bg-white px-4 py-4 shadow-lg">
                {/* Distance Display */}
                {distance > 0 && (
                    <View className="bg-green-50 rounded-xl p-4 mb-4">
                        <View className="flex-row items-center justify-between">
                            <View className="flex-1">
                                <Text className="text-green-900 font-bold text-lg">
                                    Distance: {distance} meters
                                </Text>
                                <Text className="text-green-700 text-sm mt-1">
                                    Lie: {getActiveSurfaceCondition().replace('_', ' ')}
                                    {getActiveAdditionalConditions().length > 0 && 
                                        ` + ${getActiveAdditionalConditions().join(', ')}`
                                    }
                                </Text>
                                {weather && (
                                    <Text className="text-green-700 text-sm mt-1">
                                        Wind: {weather.windSpeed}m/s {getWindDirection(weather.windDirection)}
                                        {weather.windGusts > weather.windSpeed + 1 && 
                                            ` (gusts ${weather.windGusts}m/s)`
                                        }
                                    </Text>
                                )}
                            </View>
                            <View className="flex-col space-y-2">
                                <TouchableOpacity
                                    onPress={() => setShowConditionsModal(true)}
                                    className="bg-gray-100 rounded-xl px-3 py-2"
                                >
                                    <Text className="text-green-900 font-semibold text-sm">Edit Conditions</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={getClubRecommendation}
                                    disabled={recommendationLoading}
                                    className="bg-green-600 rounded-xl px-4 py-2"
                                >
                                    {recommendationLoading ? (
                                        <ActivityIndicator size="small" color="white" />
                                    ) : (
                                        <Text className="text-white font-bold">Get Club</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                )}

                {/* Recommendation Display */}
                {recommendation && (
                    <View className="bg-blue-50 rounded-xl p-4 mb-4">
                        <Text className="text-blue-900 font-bold text-lg mb-2">
                            AI Recommendation
                        </Text>
                        <Text className="text-blue-800">
                            {recommendation.answer || 'Club recommendation received'}
                        </Text>
                    </View>
                )}

                {/* Action Buttons */}
                <View className="flex-row space-x-2">
                    <TouchableOpacity 
                        onPress={getCurrentLocation}
                        className="flex-1 bg-gray-100 rounded-xl p-3 flex-row items-center justify-center"
                    >
                        <Ionicons name="locate" size={20} color="#059669" />
                        <Text className="text-green-900 font-semibold ml-2">Recenter</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        onPress={toggleMapType}
                        className="flex-1 bg-gray-100 rounded-xl p-3 flex-row items-center justify-center"
                    >
                        <Ionicons 
                            name={mapType === 'satellite' ? 'map' : 'earth'} 
                            size={20} 
                            color="#059669" 
                        />
                        <Text className="text-green-900 font-semibold ml-2">
                            {mapType === 'satellite' ? 'Golf View' : 'Satellite'}
                        </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        onPress={() => {
                            // If there's a recommendation, show feedback modal first
                            if (recommendation) {
                                setShowFeedbackModal(true)
                            } else {
                                // No recommendation to rate, just clear everything
                                setTargetPosition(null)
                                setDistance(0)
                                setRecommendation(null)
                                setShowConditionsModal(false)
                                setConditionsModalShown(false)
                                setShowFeedbackModal(false)
                                setFeedbackData({
                                    liked: null,
                                    club_used: '',
                                    shot_result: ''
                                })
                            }
                        }}
                        className="flex-1 bg-gray-100 rounded-xl p-3 flex-row items-center justify-center"
                    >
                        <Ionicons name="refresh" size={20} color="#059669" />
                        <Text className="text-green-900 font-semibold ml-2">
                            {recommendation ? 'Rate & Clear' : 'Clear'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Shot Conditions Modal */}
            <Modal
                visible={showConditionsModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowConditionsModal(false)}
            >
                <SafeAreaView className="flex-1 bg-green-50">
                    <ScrollView className="flex-1">
                        {/* Modal Header */}
                        <View className="px-6 pt-4 pb-6 bg-white shadow-sm">
                            <View className="flex-row items-center justify-between">
                                <Text className="text-2xl font-bold text-green-900">
                                    Shot Conditions
                                </Text>
                                <TouchableOpacity
                                    onPress={() => setShowConditionsModal(false)}
                                    className="p-2"
                                >
                                    <Ionicons name="close" size={24} color="#059669" />
                                </TouchableOpacity>
                            </View>
                            <Text className="text-green-700 mt-2">
                                Select your ball's lie and course conditions for accurate club recommendations
                            </Text>
                        </View>

                        {/* Surface/Lie Conditions */}
                        <View className="px-6 py-4">
                            <Text className="text-xl font-bold text-green-900 mb-4">
                                Ball Lie (select one)
                            </Text>
                            
                            <View className="bg-white rounded-2xl p-4 shadow-sm mb-6">
                                {[
                                    { key: 'fairway', label: 'Fairway', icon: 'golf', description: 'Clean lie on short grass' },
                                    { key: 'light_rough', label: 'Light Rough', icon: 'leaf', description: 'Slightly longer grass' },
                                    { key: 'heavy_rough', label: 'Heavy Rough', icon: 'leaf-outline', description: 'Thick, long grass' },
                                    { key: 'hardpan', label: 'Hardpan', icon: 'ellipse', description: 'Bare, hard ground' },
                                    { key: 'divot', label: 'Divot', icon: 'remove', description: 'Ball in a divot hole' },
                                    { key: 'bunker', label: 'Fairway Bunker', icon: 'radio-button-off', description: 'Sand bunker' }
                                ].map((condition) => (
                                    <TouchableOpacity
                                        key={condition.key}
                                        onPress={() => handleSurfaceCondition(condition.key)}
                                        className={`flex-row items-center p-4 rounded-xl mb-2 ${
                                            shotConditions[condition.key] ? 'bg-green-100 border-2 border-green-500' : 'bg-gray-50'
                                        }`}
                                    >
                                        <View className={`w-10 h-10 rounded-full items-center justify-center mr-4 ${
                                            shotConditions[condition.key] ? 'bg-green-500' : 'bg-gray-300'
                                        }`}>
                                            <Ionicons 
                                                name={condition.icon} 
                                                size={20} 
                                                color={shotConditions[condition.key] ? 'white' : '#6B7280'} 
                                            />
                                        </View>
                                        <View className="flex-1">
                                            <Text className={`font-semibold ${
                                                shotConditions[condition.key] ? 'text-green-900' : 'text-gray-900'
                                            }`}>
                                                {condition.label}
                                            </Text>
                                            <Text className="text-gray-600 text-sm">
                                                {condition.description}
                                            </Text>
                                        </View>
                                        {shotConditions[condition.key] && (
                                            <Ionicons name="checkmark-circle" size={24} color="#059669" />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Slope Direction Conditions */}
                            <Text className="text-xl font-bold text-green-900 mb-4">
                                Slope Direction (select one)
                            </Text>
                            
                            <View className="bg-white rounded-2xl p-4 shadow-sm mb-6">
                                {[
                                    { key: 'uphill', label: 'Uphill Lie', icon: 'trending-up', description: 'Ball is on an upward slope' },
                                    { key: 'downhill', label: 'Downhill Lie', icon: 'trending-down', description: 'Ball is on a downward slope' }
                                ].map((condition) => (
                                    <TouchableOpacity
                                        key={condition.key}
                                        onPress={() => handleSlopeDirectionCondition(condition.key)}
                                        className={`flex-row items-center p-4 rounded-xl mb-2 ${
                                            shotConditions[condition.key] ? 'bg-blue-100 border-2 border-blue-500' : 'bg-gray-50'
                                        }`}
                                    >
                                        <View className={`w-10 h-10 rounded-full items-center justify-center mr-4 ${
                                            shotConditions[condition.key] ? 'bg-blue-500' : 'bg-gray-300'
                                        }`}>
                                            <Ionicons 
                                                name={condition.icon} 
                                                size={20} 
                                                color={shotConditions[condition.key] ? 'white' : '#6B7280'} 
                                            />
                                        </View>
                                        <View className="flex-1">
                                            <Text className={`font-semibold ${
                                                shotConditions[condition.key] ? 'text-blue-900' : 'text-gray-900'
                                            }`}>
                                                {condition.label}
                                            </Text>
                                            <Text className="text-gray-600 text-sm">
                                                {condition.description}
                                            </Text>
                                        </View>
                                        {shotConditions[condition.key] && (
                                            <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Ball Position Relative to Feet */}
                            <Text className="text-xl font-bold text-green-900 mb-4">
                                Ball Position (select one)
                            </Text>
                            
                            <View className="bg-white rounded-2xl p-4 shadow-sm mb-6">
                                {[
                                    { key: 'ball_above_feet', label: 'Ball Above Feet', icon: 'arrow-up', description: 'Ball is higher than your feet' },
                                    { key: 'ball_below_feet', label: 'Ball Below Feet', icon: 'arrow-down', description: 'Ball is lower than your feet' }
                                ].map((condition) => (
                                    <TouchableOpacity
                                        key={condition.key}
                                        onPress={() => handleBallPositionCondition(condition.key)}
                                        className={`flex-row items-center p-4 rounded-xl mb-2 ${
                                            shotConditions[condition.key] ? 'bg-purple-100 border-2 border-purple-500' : 'bg-gray-50'
                                        }`}
                                    >
                                        <View className={`w-10 h-10 rounded-full items-center justify-center mr-4 ${
                                            shotConditions[condition.key] ? 'bg-purple-500' : 'bg-gray-300'
                                        }`}>
                                            <Ionicons 
                                                name={condition.icon} 
                                                size={20} 
                                                color={shotConditions[condition.key] ? 'white' : '#6B7280'} 
                                            />
                                        </View>
                                        <View className="flex-1">
                                            <Text className={`font-semibold ${
                                                shotConditions[condition.key] ? 'text-purple-900' : 'text-gray-900'
                                            }`}>
                                                {condition.label}
                                            </Text>
                                            <Text className="text-gray-600 text-sm">
                                                {condition.description}
                                            </Text>
                                        </View>
                                        {shotConditions[condition.key] && (
                                            <Ionicons name="checkmark-circle" size={24} color="#8B5CF6" />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Ground Conditions */}
                            <Text className="text-xl font-bold text-green-900 mb-4">
                                Ground Conditions (select one)
                            </Text>
                            
                            <View className="bg-white rounded-2xl p-4 shadow-sm mb-6">
                                {[
                                    { key: 'wet_ground', label: 'Wet Ground', icon: 'water', description: 'Soft, wet conditions - less roll' },
                                    { key: 'firm_ground', label: 'Firm Ground', icon: 'sunny', description: 'Hard, dry conditions - more roll' }
                                ].map((condition) => (
                                    <TouchableOpacity
                                        key={condition.key}
                                        onPress={() => handleGroundCondition(condition.key)}
                                        className={`flex-row items-center p-4 rounded-xl mb-2 ${
                                            shotConditions[condition.key] ? 'bg-orange-100 border-2 border-orange-500' : 'bg-gray-50'
                                        }`}
                                    >
                                        <View className={`w-10 h-10 rounded-full items-center justify-center mr-4 ${
                                            shotConditions[condition.key] ? 'bg-orange-500' : 'bg-gray-300'
                                        }`}>
                                            <Ionicons 
                                                name={condition.icon} 
                                                size={20} 
                                                color={shotConditions[condition.key] ? 'white' : '#6B7280'} 
                                            />
                                        </View>
                                        <View className="flex-1">
                                            <Text className={`font-semibold ${
                                                shotConditions[condition.key] ? 'text-orange-900' : 'text-gray-900'
                                            }`}>
                                                {condition.label}
                                            </Text>
                                            <Text className="text-gray-600 text-sm">
                                                {condition.description}
                                            </Text>
                                        </View>
                                        {shotConditions[condition.key] && (
                                            <Ionicons name="checkmark-circle" size={24} color="#F59E0B" />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Modal Footer */}
                        <View className="px-6 py-4 bg-white">
                            <TouchableOpacity
                                onPress={() => setShowConditionsModal(false)}
                                className="bg-green-600 rounded-2xl p-4 shadow-sm"
                            >
                                <Text className="text-white font-bold text-center text-lg">
                                    Apply Conditions
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </SafeAreaView>
            </Modal>

            {/* Shot Feedback Modal */}
            <Modal
                visible={showFeedbackModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowFeedbackModal(false)}
            >
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
                            {/* Modal Header */}
                            <View className="px-6 pt-4 pb-6 bg-white shadow-sm">
                                <View className="flex-row items-center justify-between">
                                    <Text className="text-2xl font-bold text-green-900">
                                        Rate This Recommendation
                                    </Text>
                                    <TouchableOpacity
                                        onPress={() => setShowFeedbackModal(false)}
                                        className="p-2"
                                    >
                                        <Ionicons name="close" size={24} color="#059669" />
                                    </TouchableOpacity>
                                </View>
                                <Text className="text-green-700 mt-2">
                                    Help personalize your caddie! Rate this recommendation to get better suggestions for future shots.
                                </Text>
                            </View>

                            {/* Feedback Form */}
                            <View className="px-6 py-4">
                                {/* Rating Section */}
                                <Text className="text-xl font-bold text-green-900 mb-4">
                                    How was this recommendation?
                                </Text>
                                
                                <View className="bg-white rounded-2xl p-4 shadow-sm mb-6">
                                    <View className="flex-row justify-center space-x-8">
                                        <TouchableOpacity
                                            onPress={() => setFeedbackData(prev => ({ ...prev, liked: false }))}
                                            className={`flex-1 p-4 rounded-xl items-center ${
                                                feedbackData.liked === false ? 'bg-red-100 border-2 border-red-500' : 'bg-gray-50'
                                            }`}
                                        >
                                            <Ionicons 
                                                name="thumbs-down" 
                                                size={32} 
                                                color={feedbackData.liked === false ? '#EF4444' : '#6B7280'} 
                                            />
                                            <Text className={`mt-2 font-semibold ${
                                                feedbackData.liked === false ? 'text-red-700' : 'text-gray-600'
                                            }`}>
                                                Not Helpful
                                            </Text>
                                        </TouchableOpacity>
                                        
                                        <TouchableOpacity
                                            onPress={() => setFeedbackData(prev => ({ ...prev, liked: true }))}
                                            className={`flex-1 p-4 rounded-xl items-center ${
                                                feedbackData.liked === true ? 'bg-green-100 border-2 border-green-500' : 'bg-gray-50'
                                            }`}
                                        >
                                            <Ionicons 
                                                name="thumbs-up" 
                                                size={32} 
                                                color={feedbackData.liked === true ? '#059669' : '#6B7280'} 
                                            />
                                            <Text className={`mt-2 font-semibold ${
                                                feedbackData.liked === true ? 'text-green-700' : 'text-gray-600'
                                            }`}>
                                                Helpful
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* Club Used Section */}
                                <Text className="text-xl font-bold text-green-900 mb-4">
                                    What club did you use? (Optional)
                                </Text>
                                
                                <View className="bg-white rounded-2xl p-4 shadow-sm mb-6">
                                    <TextInput
                                        value={feedbackData.club_used}
                                        onChangeText={(text) => setFeedbackData(prev => ({ ...prev, club_used: text }))}
                                        placeholder="e.g., 7 iron, Driver, Pitching Wedge"
                                        className="text-gray-900 text-lg"
                                        placeholderTextColor="#9CA3AF"
                                        returnKeyType="next"
                                        blurOnSubmit={false}
                                        onSubmitEditing={() => {
                                            // Focus on the next input (shot result)
                                            // This will be handled by the scroll behavior
                                        }}
                                    />
                                </View>

                                {/* Shot Result Section */}
                                <Text className="text-xl font-bold text-green-900 mb-4">
                                    How did the shot turn out? (Optional)
                                </Text>
                                
                                <View className="bg-white rounded-2xl p-4 shadow-sm mb-6">
                                    <TextInput
                                        value={feedbackData.shot_result}
                                        onChangeText={(text) => setFeedbackData(prev => ({ ...prev, shot_result: text }))}
                                        placeholder="e.g., on green, short, long, left, right"
                                        className="text-gray-900 text-lg"
                                        placeholderTextColor="#9CA3AF"
                                        multiline
                                        numberOfLines={2}
                                        returnKeyType="done"
                                        textAlignVertical="top"
                                    />
                                </View>
                            </View>

                            {/* Modal Footer */}
                            <View className="px-6 py-4 bg-white">
                                <TouchableOpacity
                                    onPress={submitFeedback}
                                    disabled={feedbackData.liked === null || feedbackLoading}
                                    className={`rounded-2xl p-4 shadow-sm mb-3 ${
                                        feedbackData.liked === null ? 'bg-gray-300' : 'bg-green-600'
                                    }`}
                                >
                                    {feedbackLoading ? (
                                        <ActivityIndicator size="small" color="white" />
                                    ) : (
                                        <Text className={`font-bold text-center text-lg ${
                                            feedbackData.liked === null ? 'text-gray-500' : 'text-white'
                                        }`}>
                                            Submit Rating & Clear
                                        </Text>
                                    )}
                                </TouchableOpacity>
                                
                                {/* Skip Rating Option */}
                                <TouchableOpacity
                                    onPress={() => {
                                        // Close modal and clear everything without rating
                                        setShowFeedbackModal(false)
                                        setFeedbackData({
                                            liked: null,
                                            club_used: '',
                                            shot_result: ''
                                        })
                                        setTargetPosition(null)
                                        setDistance(0)
                                        setRecommendation(null)
                                        setShowConditionsModal(false)
                                        setConditionsModalShown(false)
                                    }}
                                    className="p-3"
                                >
                                    <Text className="text-gray-500 text-center font-medium">
                                        Skip Rating & Clear
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </KeyboardAvoidingView>
                </SafeAreaView>
            </Modal>

            {/* Round Tracking Modal */}
            <Modal
                visible={showShotModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowShotModal(false)}
            >
                <SafeAreaView className="flex-1 bg-green-50">
                    <ScrollView className="flex-1">
                        {/* Modal Header */}
                        <View className="px-6 pt-4 pb-6 bg-white shadow-sm">
                            <View className="flex-row items-center justify-between">
                                <Text className="text-2xl font-bold text-green-900">
                                    Round Tracking
                                </Text>
                                <TouchableOpacity
                                    onPress={() => setShowShotModal(false)}
                                    className="p-2"
                                >
                                    <Ionicons name="close" size={24} color="#059669" />
                                </TouchableOpacity>
                            </View>
                            
                            {currentRound && (
                                <View className="mt-4">
                                    <Text className="text-xl font-semibold text-green-900">
                                        {currentRound.course_name}
                                    </Text>
                                    <Text className="text-green-700 mt-1">
                                        {currentRound.total_holes} holes • Total: {getTotalShots()} ({getScoreRelativeToPar() >= 0 ? '+' : ''}{getScoreRelativeToPar()})
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Current Hole Section */}
                        {currentRound ? (
                            <View className="px-6 py-6">
                                <View className="bg-white rounded-2xl p-6 shadow-sm mb-6">
                                    
                                    {/* Hole Navigation */}
                                    <View className="flex-row items-center justify-between mb-8">
                                        <TouchableOpacity
                                            onPress={handlePreviousHole}
                                            disabled={currentHole <= 1}
                                            className={`flex-row items-center p-2 rounded-xl ${
                                                currentHole <= 1 ? 'bg-gray-100' : 'bg-gray-100'
                                            }`}
                                        >
                                            <Ionicons 
                                                name="chevron-back" 
                                                size={20} 
                                                color={currentHole <= 1 ? '#9CA3AF' : '#059669'} 
                                            />
                                            <Text className={`ml-2 font-semibold ${
                                                currentHole <= 1 ? 'text-gray-400' : 'text-green-700'
                                            }`}>
                                                Previous
                                            </Text>
                                        </TouchableOpacity>
                                        
                                        <View className="items-center">
                                            <Text className="text-4xl font-bold text-green-900">
                                                Hole {currentHole}
                                            </Text>
                                        </View>
                                        
                                        <TouchableOpacity
                                            onPress={handleNextHole}
                                            disabled={currentHole >= currentRound.total_holes}
                                            className={`flex-row items-center p-2 rounded-xl ${
                                                currentHole >= currentRound.total_holes ? 'bg-gray-100' : 'bg-gray-100'
                                            }`}
                                        >
                                            <Text className={`mr-2 font-semibold ${
                                                currentHole >= currentRound.total_holes ? 'text-gray-400' : 'text-green-700'
                                            }`}>
                                                Next
                                            </Text>
                                            <Ionicons 
                                                name="chevron-forward" 
                                                size={20} 
                                                color={currentHole >= currentRound.total_holes ? '#9CA3AF' : '#059669'} 
                                            />
                                        </TouchableOpacity>
                                    </View>

                                    {/* Par Selection */}
                                    <View className="mb-8">
                                        <View className="flex-row items-center justify-center">
                                            <Text className="text-2xl font-bold text-green-900">
                                                Par {getCurrentHolePar()}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Shot Counter */}
                                    <View className="mb-8">
                                        <View className="p-6 items-center">
                                            <Text className="text-6xl font-bold text-green-900 mb-4">
                                                {currentShots}
                                            </Text>
                                           
                                            <View className="flex-row gap-4">
                                                <TouchableOpacity
                                                    onPress={removeShot}
                                                    disabled={currentShots <= 0}
                                                    className={`w-14 h-14 rounded-md items-center justify-center ${
                                                        currentShots <= 0 ? 'bg-gray-200' : 'bg-green-600'
                                                    }`}
                                                >
                                                    <Ionicons 
                                                        name="remove" 
                                                        size={32} 
                                                        color="white" 
                                                    />
                                                </TouchableOpacity>
                                                
                                                <TouchableOpacity
                                                    onPress={addShot}
                                                    className="w-14 h-14 rounded-md items-center justify-center bg-green-600"
                                                >
                                                    <Ionicons name="add" size={32} color="white" />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    </View>

                                    {/* Score Relative to Par */}
                                    {currentShots > 0 && (
                                        <View className="mb-8">
                                            <View className="p-6">
                                                <Text className="text-center text-lg font-semibold text-green-900 mb-2">
                                                    Current Score
                                                </Text>
                                                <Text className="text-center text-3xl font-bold text-green-900">
                                                    {currentShots - getCurrentHolePar() === 0 ? 'Par' :
                                                     currentShots - getCurrentHolePar() < 0 ? `${currentShots - getCurrentHolePar()}` :
                                                     `+${currentShots - getCurrentHolePar()}`}
                                                </Text>
                                            </View>
                                        </View>
                                    )}

                                    {/* Action Buttons */}
                                    <View className="space-y-4">
                                        <TouchableOpacity
                                            onPress={async () => {
                                                try {
                                                    await saveHoleScore()
                                                    
                                                    // Auto-advance to next hole if not the last hole
                                                    if (currentHole < currentRound.total_holes) {
                                                        handleNextHole()
                                                    }
                                                    
                                                    setShowShotModal(false)
                                                } catch (error) {
                                                    // Error is already handled in saveHoleScore
                                                }
                                            }}
                                            disabled={currentShots === 0}
                                            className={`py-4 mb-2 rounded-xl ${
                                                currentShots === 0 ? 'bg-gray-200' : 'bg-green-600'
                                            }`}
                                        >
                                            <Text className={`text-center font-bold text-lg ${
                                                currentShots === 0 ? 'text-gray-400' : 'text-white'
                                            }`}>
                                                {currentHole < currentRound.total_holes ? 'Save & Next Hole' : 'Save Score'}
                                            </Text>
                                        </TouchableOpacity>
                                        
                                        <TouchableOpacity
                                            onPress={() => {
                                                confirmCompleteRound()
                                                setShowShotModal(false)
                                            }}
                                            className={`py-4 rounded-xl ${
                                                getTotalShots() === 0 ? 'bg-gray-400' : 'bg-green-700'
                                            }`}
                                            disabled={getTotalShots() === 0}
                                        >
                                            <Text className="text-white text-center font-bold text-lg">
                                                Complete Round
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        ) : (
                            <View className="px-6 py-6">
                                <View className="bg-white rounded-2xl p-6 shadow-sm items-center">
                                    <Ionicons name="golf-outline" size={64} color="#059669" />
                                    <Text className="text-green-900 text-xl font-bold mt-4 text-center">
                                        No Active Round
                                    </Text>
                                    <Text className="text-green-700 mt-2 text-center">
                                        Start a new round to begin tracking your scores
                                    </Text>
                                    <TouchableOpacity 
                                        onPress={() => {
                                            setShowShotModal(false)
                                            router.push('/(dashboard)/start-round')
                                        }}
                                        className="bg-green-600 rounded-xl px-6 py-3 mt-6"
                                    >
                                        <Text className="text-white font-bold">Start New Round</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </ScrollView>
                </SafeAreaView>
            </Modal>

            {/* Complete Round Modal */}
            <Modal
                visible={showCompleteRoundModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowCompleteRoundModal(false)}
            >
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
                            {/* Modal Header */}
                            <View className="px-6 pt-4 pb-6 bg-white shadow-sm">
                                <View className="flex-row items-center justify-between">
                                    <Text className="text-2xl font-bold text-green-900">
                                        Complete Round
                                    </Text>
                                    <TouchableOpacity
                                        onPress={() => setShowCompleteRoundModal(false)}
                                        className="p-2"
                                    >
                                        <Ionicons name="close" size={24} color="#059669" />
                                    </TouchableOpacity>
                                </View>
                                <Text className="text-green-700 mt-2">
                                    Finish your round and save your scores
                                </Text>
                            </View>

                            {/* Round Summary */}
                            <View className="px-6 py-4">
                                {currentRound && (
                                    <View className="bg-white rounded-2xl p-6 shadow-sm mb-6">
                                        <Text className="text-xl font-bold text-green-900 mb-4">
                                            Round Summary
                                        </Text>
                                        
                                        <View className="space-y-3">
                                            <View className="flex-row justify-between">
                                                <Text className="text-gray-600">Course:</Text>
                                                <Text className="font-semibold text-gray-900">{currentRound.course_name}</Text>
                                            </View>
                                            
                                            <View className="flex-row justify-between">
                                                <Text className="text-gray-600">Holes:</Text>
                                                <Text className="font-semibold text-gray-900">{currentRound.total_holes}</Text>
                                            </View>
                                            
                                            <View className="flex-row justify-between">
                                                <Text className="text-gray-600">Total Shots:</Text>
                                                <Text className="font-semibold text-gray-900">{getTotalShots()}</Text>
                                            </View>
                                            
                                            <View className="flex-row justify-between">
                                                <Text className="text-gray-600">Par:</Text>
                                                <Text className="font-semibold text-gray-900">{currentRound.total_par}</Text>
                                            </View>
                                            
                                            <View className="flex-row justify-between border-t border-gray-200 pt-3">
                                                <Text className="text-gray-600 font-semibold">Score:</Text>
                                                <Text className={`font-bold text-lg ${
                                                    getScoreRelativeToPar() === 0 ? 'text-green-600' :
                                                    getScoreRelativeToPar() < 0 ? 'text-blue-600' : 'text-red-600'
                                                }`}>
                                                    {getScoreRelativeToPar() === 0 ? 'Even' :
                                                     getScoreRelativeToPar() > 0 ? `+${getScoreRelativeToPar()}` :
                                                     `${getScoreRelativeToPar()}`}
                                                </Text>
                                            </View>
                                            
                                            {/* Handicap Eligibility Warning */}
                                            {currentRound.hole_scores.some(hole => hole.shots === 0) && (
                                                <View className="mt-4 bg-yellow-50 rounded-lg p-3">
                                                    <Text className="text-yellow-800 text-sm">
                                                        Note: This round will not count towards your handicap because some holes are incomplete.
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                )}

                                {/* Hole-by-Hole Breakdown */}
                                {currentRound && (
                                    <View className="bg-white rounded-2xl p-6 shadow-sm mb-6">
                                        <Text className="text-lg font-bold text-green-900 mb-4">
                                            Hole-by-Hole
                                        </Text>
                                        
                                        <View className="space-y-2">
                                            {currentRound.hole_scores.map((hole) => (
                                                <View key={hole.hole_number} className="flex-row justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                                                    <Text className="font-medium text-gray-900">
                                                        Hole {hole.hole_number}
                                                    </Text>
                                                    <View className="flex-row items-center space-x-4">
                                                        <Text className="text-gray-600">
                                                            Par {hole.par}
                                                        </Text>
                                                        <Text className="font-semibold text-gray-900 min-w-[30px] text-center">
                                                            {hole.shots || '-'}
                                                        </Text>
                                                        <Text className={`font-semibold min-w-[30px] text-center ${
                                                            hole.score_relative_to_par === 0 ? 'text-green-600' :
                                                            hole.score_relative_to_par < 0 ? 'text-blue-600' : 'text-red-600'
                                                        }`}>
                                                            {hole.shots === 0 ? '-' :
                                                             hole.score_relative_to_par === 0 ? 'E' :
                                                             hole.score_relative_to_par > 0 ? `+${hole.score_relative_to_par}` :
                                                             `${hole.score_relative_to_par}`}
                                                        </Text>
                                                    </View>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                )}

                                {/* Round Notes */}
                                <View className="bg-white rounded-2xl p-6 shadow-sm mb-6">
                                    <Text className="text-lg font-bold text-green-900 mb-4">
                                        Round Notes (Optional)
                                    </Text>
                                    
                                    <TextInput
                                        value={roundNotes}
                                        onChangeText={setRoundNotes}
                                        placeholder="How was your round? Any memorable shots or thoughts..."
                                        className="text-gray-900 text-base border border-gray-300 rounded-lg p-4"
                                        placeholderTextColor="#9CA3AF"
                                        multiline
                                        numberOfLines={4}
                                        textAlignVertical="top"
                                        maxLength={500}
                                    />
                                    <Text className="text-gray-500 text-sm mt-2 text-right">
                                        {roundNotes.length}/500
                                    </Text>
                                </View>
                            </View>

                            {/* Modal Footer */}
                            <View className="px-6 py-4 bg-white">
                                <TouchableOpacity
                                    onPress={handleCompleteRound}
                                    disabled={completingRound}
                                    className="bg-green-600 rounded-2xl p-4 shadow-sm mb-3"
                                >
                                    {completingRound ? (
                                        <ActivityIndicator size="small" color="white" />
                                    ) : (
                                        <Text className="text-white font-bold text-center text-lg">
                                            Complete Round
                                        </Text>
                                    )}
                                </TouchableOpacity>
                                
                                <TouchableOpacity
                                    onPress={() => setShowCompleteRoundModal(false)}
                                    className="p-3"
                                >
                                    <Text className="text-gray-500 text-center font-medium">
                                        Continue Playing
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </KeyboardAvoidingView>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    )
  }