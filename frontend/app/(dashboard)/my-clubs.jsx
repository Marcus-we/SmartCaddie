import { useState, useEffect, useCallback } from 'react'
import { Text, View, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Modal, TextInput, Switch, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Link } from 'expo-router'
import authStore from '../../store/authStore'

const AddClubModal = ({ 
    visible, 
    onClose, 
    onSave, 
    clubs, 
    onUpdateClub, 
    onAddClubForm, 
    onRemoveClubForm, 
    isLoading 
}) => (
    <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
    >
        <SafeAreaView className="flex-1 bg-green-50" edges={['top']}>
            <KeyboardAvoidingView 
                className="flex-1"
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <View className="flex-1">
                    {/* Header */}
                    <View className="px-6 py-4 bg-white border-b border-gray-200">
                        <View className="flex-row items-center justify-between">
                            <TouchableOpacity 
                                onPress={onClose}
                                className="p-2"
                            >
                                <Text className="text-green-600 font-semibold">Cancel</Text>
                            </TouchableOpacity>
                            <Text className="text-xl font-bold text-green-900">
                                Add Clubs
                            </Text>
                            <TouchableOpacity 
                                onPress={onSave}
                                disabled={isLoading}
                                className="p-2"
                            >
                                {isLoading ? (
                                    <ActivityIndicator size="small" color="#059669" />
                                ) : (
                                    <Text className="text-green-600 font-semibold">Save</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>

                    <ScrollView className="flex-1 px-6 py-4">
                        {clubs.map((club, index) => (
                            <View key={index} className="bg-white rounded-2xl p-4 shadow-sm mb-4">
                                <View className="flex-row items-center justify-between mb-4">
                                    <Text className="text-lg font-bold text-gray-900">
                                        Club {index + 1}
                                    </Text>
                                    {clubs.length > 1 && (
                                        <TouchableOpacity 
                                            onPress={() => onRemoveClubForm(index)}
                                            className="p-1"
                                        >
                                            <Ionicons name="close-circle" size={24} color="#DC2626" />
                                        </TouchableOpacity>
                                    )}
                                </View>

                                {/* Club Name */}
                                <View className="mb-4">
                                    <Text className="text-gray-700 font-semibold mb-2">Club Name</Text>
                                    <TextInput
                                        value={club.club}
                                        onChangeText={(text) => onUpdateClub(index, 'club', text)}
                                        placeholder="e.g., Driver, 7 Iron, Pitching Wedge"
                                        className="bg-gray-50 rounded-xl p-4 text-gray-900"
                                        placeholderTextColor="#9CA3AF"
                                        returnKeyType="next"
                                        blurOnSubmit={false}
                                    />
                                </View>

                                {/* Distance */}
                                <View className="mb-4">
                                    <Text className="text-gray-700 font-semibold mb-2">Average Distance (meters)</Text>
                                    <TextInput
                                        value={club.distance_meter}
                                        onChangeText={(text) => onUpdateClub(index, 'distance_meter', text)}
                                        placeholder="e.g., 250"
                                        keyboardType="numeric"
                                        className="bg-gray-50 rounded-xl p-4 text-gray-900"
                                        placeholderTextColor="#9CA3AF"
                                        returnKeyType="done"
                                    />
                                </View>

                                {/* Preferred Club */}
                                <View className="flex-row items-center justify-between">
                                    <Text className="text-gray-700 font-semibold">Preferred Club</Text>
                                    <Switch
                                        value={club.preferred_club}
                                        onValueChange={(value) => onUpdateClub(index, 'preferred_club', value)}
                                        trackColor={{ false: '#E5E7EB', true: '#059669' }}
                                        thumbColor={club.preferred_club ? '#FFFFFF' : '#FFFFFF'}
                                    />
                                </View>
                            </View>
                        ))}

                        {/* Add Another Club Button */}
                        <TouchableOpacity 
                            onPress={onAddClubForm}
                            className="bg-green-100 rounded-2xl p-4 shadow-sm mb-6 border-2 border-dashed border-green-300"
                        >
                            <View className="flex-row items-center justify-center">
                                <Ionicons name="add-circle-outline" size={24} color="#059669" />
                                <Text className="text-green-600 font-bold ml-2">
                                    Add Another Club
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    </Modal>
)

const EditClubModal = ({ 
    visible, 
    onClose, 
    onSave, 
    club, 
    onUpdateClub, 
    isLoading 
}) => (
    <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
    >
        <SafeAreaView className="flex-1 bg-green-50" edges={['top']}>
            <KeyboardAvoidingView 
                className="flex-1"
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <View className="flex-1">
                    {/* Header */}
                    <View className="px-6 py-4 bg-white border-b border-gray-200">
                        <View className="flex-row items-center justify-between">
                            <TouchableOpacity 
                                onPress={onClose}
                                className="p-2"
                            >
                                <Text className="text-green-600 font-semibold">Cancel</Text>
                            </TouchableOpacity>
                            <Text className="text-xl font-bold text-green-900">
                                Edit Club
                            </Text>
                            <TouchableOpacity 
                                onPress={onSave}
                                disabled={isLoading}
                                className="p-2"
                            >
                                {isLoading ? (
                                    <ActivityIndicator size="small" color="#059669" />
                                ) : (
                                    <Text className="text-green-600 font-semibold">Save</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>

                    <ScrollView className="flex-1 px-6 py-4">
                        <View className="bg-white rounded-2xl p-4 shadow-sm mb-4">
                            {/* Club Name */}
                            <View className="mb-4">
                                <Text className="text-gray-700 font-semibold mb-2">Club Name</Text>
                                <TextInput
                                    value={club?.club || ''}
                                    onChangeText={(text) => onUpdateClub('club', text)}
                                    placeholder="e.g., Driver, 7 Iron, Pitching Wedge"
                                    className="bg-gray-50 rounded-xl p-4 text-gray-900"
                                    placeholderTextColor="#9CA3AF"
                                    returnKeyType="next"
                                    blurOnSubmit={false}
                                />
                            </View>

                            {/* Distance */}
                            <View className="mb-4">
                                <Text className="text-gray-700 font-semibold mb-2">Average Distance (meters)</Text>
                                <TextInput
                                    value={club?.distance_meter?.toString() || ''}
                                    onChangeText={(text) => onUpdateClub('distance_meter', text)}
                                    placeholder="e.g., 250"
                                    keyboardType="numeric"
                                    className="bg-gray-50 rounded-xl p-4 text-gray-900"
                                    placeholderTextColor="#9CA3AF"
                                    returnKeyType="done"
                                />
                            </View>

                            {/* Preferred Club */}
                            <View className="flex-row items-center justify-between">
                                <Text className="text-gray-700 font-semibold">Preferred Club</Text>
                                <Switch
                                    value={club?.preferred_club || false}
                                    onValueChange={(value) => onUpdateClub('preferred_club', value)}
                                    trackColor={{ false: '#E5E7EB', true: '#059669' }}
                                    thumbColor={club?.preferred_club ? '#FFFFFF' : '#FFFFFF'}
                                />
                            </View>
                        </View>
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    </Modal>
)

export default function MyClubs() {
    const { token } = authStore()
    const [clubs, setClubs] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [showAddModal, setShowAddModal] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [newClubs, setNewClubs] = useState([{ club: '', distance_meter: '', preferred_club: false }])
    const [editingClub, setEditingClub] = useState(null)
    const [originalClubName, setOriginalClubName] = useState('')
    const [addingClubs, setAddingClubs] = useState(false)
    const [updatingClub, setUpdatingClub] = useState(false)
    const [deletingClub, setDeletingClub] = useState(null)

    useEffect(() => {
        fetchClubs()
    }, [])

    const fetchClubs = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            
            const response = await fetch('http://192.168.0.129:8000/v1/clubs', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            })

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            const data = await response.json()
            setClubs(data)
        } catch (err) {
            console.error('Error fetching clubs:', err)
            setError(err.message)
            Alert.alert('Error', 'Failed to load your clubs. Please try again.')
        } finally {
            setLoading(false)
        }
    }, [token])

    const addClubs = useCallback(async () => {
        try {
            setAddingClubs(true)
            
            // Validate clubs
            const validClubs = newClubs.filter(club => 
                club.club.trim() !== '' && 
                club.distance_meter !== '' && 
                !isNaN(parseFloat(club.distance_meter))
            )

            if (validClubs.length === 0) {
                Alert.alert('Error', 'Please add at least one valid club with name and distance.')
                return
            }

            // Format clubs for API
            const clubsToAdd = validClubs.map(club => ({
                club: club.club.trim(),
                distance_meter: parseFloat(club.distance_meter),
                preferred_club: club.preferred_club
            }))

            const response = await fetch('http://192.168.0.129:8000/v1/clubs', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ clubs: clubsToAdd })
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.detail || `HTTP error! status: ${response.status}`)
            }

            const result = await response.json()
            
            // Reset form and close modal
            setNewClubs([{ club: '', distance_meter: '', preferred_club: false }])
            setShowAddModal(false)
            
            // Refresh clubs list
            await fetchClubs()
            
            Alert.alert('Success', result.message || `Successfully added ${clubsToAdd.length} club${clubsToAdd.length > 1 ? 's' : ''}!`)
            
        } catch (err) {
            console.error('Error adding clubs:', err)
            Alert.alert('Error', err.message || 'Failed to add clubs. Please try again.')
        } finally {
            setAddingClubs(false)
        }
    }, [newClubs, token, fetchClubs])

    const updateExistingClub = useCallback(async () => {
        try {
            setUpdatingClub(true)
            
            // Validate club data
            if (!editingClub?.club?.trim()) {
                Alert.alert('Error', 'Please enter a club name.')
                return
            }

            if (!editingClub?.distance_meter || isNaN(parseFloat(editingClub.distance_meter))) {
                Alert.alert('Error', 'Please enter a valid distance.')
                return
            }

            // Format club data for API
            const clubData = {
                club: editingClub.club.trim(),
                distance_meter: parseFloat(editingClub.distance_meter),
                preferred_club: editingClub.preferred_club
            }

            const response = await fetch(`http://192.168.0.129:8000/v1/clubs/${encodeURIComponent(originalClubName)}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(clubData)
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.detail || `HTTP error! status: ${response.status}`)
            }

            // Close modal and refresh clubs list
            setShowEditModal(false)
            setEditingClub(null)
            setOriginalClubName('')
            
            await fetchClubs()
            
            Alert.alert('Success', 'Club updated successfully!')
            
        } catch (err) {
            console.error('Error updating club:', err)
            Alert.alert('Error', err.message || 'Failed to update club. Please try again.')
        } finally {
            setUpdatingClub(false)
        }
    }, [editingClub, originalClubName, token, fetchClubs])

    const deleteClub = useCallback(async (clubName) => {
        try {
            setDeletingClub(clubName)
            
            const response = await fetch(`http://192.168.0.129:8000/v1/clubs/${encodeURIComponent(clubName)}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.detail || `HTTP error! status: ${response.status}`)
            }

            const result = await response.json()
            
            // Refresh clubs list
            await fetchClubs()
            
            Alert.alert('Success', result.message || 'Club deleted successfully!')
            
        } catch (err) {
            console.error('Error deleting club:', err)
            Alert.alert('Error', err.message || 'Failed to delete club. Please try again.')
        } finally {
            setDeletingClub(null)
        }
    }, [token, fetchClubs])

    const confirmDeleteClub = useCallback((club) => {
        Alert.alert(
            'Delete Club',
            `Are you sure you want to delete "${club.club}"? This action cannot be undone.`,
            [
                {
                    text: 'Cancel',
                    style: 'cancel'
                },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => deleteClub(club.club)
                }
            ]
        )
    }, [deleteClub])

    const updateClub = useCallback((index, field, value) => {
        setNewClubs(prevClubs => {
            const updatedClubs = [...prevClubs]
            updatedClubs[index] = { ...updatedClubs[index], [field]: value }
            return updatedClubs
        })
    }, [])

    const updateEditingClub = useCallback((field, value) => {
        setEditingClub(prevClub => ({
            ...prevClub,
            [field]: field === 'distance_meter' ? value : value
        }))
    }, [])

    const addNewClubForm = useCallback(() => {
        setNewClubs(prevClubs => [...prevClubs, { club: '', distance_meter: '', preferred_club: false }])
    }, [])

    const removeClubForm = useCallback((index) => {
        setNewClubs(prevClubs => {
            if (prevClubs.length > 1) {
                return prevClubs.filter((_, i) => i !== index)
            }
            return prevClubs
        })
    }, [])

    const openAddModal = useCallback(() => {
        setNewClubs([{ club: '', distance_meter: '', preferred_club: false }])
        setShowAddModal(true)
    }, [])

    const closeAddModal = useCallback(() => {
        setShowAddModal(false)
    }, [])

    const openEditModal = useCallback((club) => {
        setEditingClub({
            club: club.club,
            distance_meter: club.distance_meter.toString(),
            preferred_club: club.preferred_club
        })
        setOriginalClubName(club.club)
        setShowEditModal(true)
    }, [])

    const closeEditModal = useCallback(() => {
        setShowEditModal(false)
        setEditingClub(null)
        setOriginalClubName('')
    }, [])

    const ClubCard = ({ club }) => (
        <View className="bg-white rounded-2xl p-4 shadow-sm mb-4 border border-green-100">
            <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                    <View className="w-12 h-12 bg-green-100 rounded-full items-center justify-center mr-4">
                        <Ionicons name="golf" size={24} color="#059669" />
                    </View>
                    <View className="flex-1">
                        <View className="flex-row items-center">
                            <Text className="text-lg font-bold text-gray-900">
                                {club.club}
                            </Text>
                            {club.preferred_club && (
                                <View className="ml-2 bg-green-500 rounded-full px-2 py-1">
                                    <Text className="text-white text-xs font-semibold">
                                        Preferred
                                    </Text>
                                </View>
                            )}
                        </View>
                        <Text className="text-green-600 font-semibold mt-1">
                            {club.distance_meter}m average distance
                        </Text>
                    </View>
                </View>
                <View className="flex-row items-center">
                    <TouchableOpacity 
                        className="p-2 mr-1"
                        onPress={() => openEditModal(club)}
                    >
                        <Ionicons name="create-outline" size={20} color="#6B7280" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                        className="p-2"
                        onPress={() => confirmDeleteClub(club)}
                        disabled={deletingClub === club.club}
                    >
                        {deletingClub === club.club ? (
                            <ActivityIndicator size="small" color="#DC2626" />
                        ) : (
                            <Ionicons name="trash-outline" size={20} color="#DC2626" />
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    )

    const EmptyState = () => (
        <View className="bg-white rounded-2xl p-8 shadow-sm items-center">
            <Ionicons name="golf-outline" size={64} color="#9CA3AF" />
            <Text className="text-gray-500 text-lg font-semibold mt-4 text-center">
                No clubs in your bag yet
            </Text>
            <Text className="text-gray-400 text-sm text-center mt-2 mb-6">
                Add your golf clubs to get personalized recommendations
            </Text>
            <TouchableOpacity 
                className="bg-green-600 rounded-xl px-6 py-3"
                onPress={openAddModal}
            >
                <View className="flex-row items-center">
                    <Ionicons name="add" size={20} color="white" />
                    <Text className="text-white font-semibold ml-2">
                        Add Your First Club
                    </Text>
                </View>
            </TouchableOpacity>
        </View>
    )

    return (
        <SafeAreaView className="flex-1 bg-green-50" edges={['top']}>
            <ScrollView className="flex-1">
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
                                My Clubs
                            </Text>
                            <Text className="text-green-700 mt-1">
                                Manage your golf club collection
                            </Text>
                        </View>
                        <TouchableOpacity 
                            className="p-2"
                            onPress={openAddModal}
                        >
                            <Ionicons name="add-circle" size={28} color="#059669" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Content */}
                <View className="px-6">
                    {loading ? (
                        <View className="bg-white rounded-2xl p-8 shadow-sm items-center">
                            <ActivityIndicator size="large" color="#059669" />
                            <Text className="text-gray-600 mt-4">Loading your clubs...</Text>
                        </View>
                    ) : error ? (
                        <View className="bg-white rounded-2xl p-8 shadow-sm items-center">
                            <Ionicons name="alert-circle-outline" size={48} color="#DC2626" />
                            <Text className="text-red-600 text-lg font-semibold mt-4 text-center">
                                Error loading clubs
                            </Text>
                            <Text className="text-gray-500 text-sm text-center mt-2 mb-6">
                                {error}
                            </Text>
                            <TouchableOpacity 
                                className="bg-green-600 rounded-xl px-6 py-3"
                                onPress={fetchClubs}
                            >
                                <View className="flex-row items-center">
                                    <Ionicons name="refresh" size={20} color="white" />
                                    <Text className="text-white font-semibold ml-2">
                                        Try Again
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    ) : clubs.length === 0 ? (
                        <EmptyState />
                    ) : (
                        <View>
                            <View className="flex-row items-center justify-between mb-4">
                                <Text className="text-lg font-bold text-green-900">
                                    {clubs.length} Club{clubs.length !== 1 ? 's' : ''} in Your Bag
                                </Text>
                                <TouchableOpacity 
                                    onPress={fetchClubs}
                                    className="p-2"
                                >
                                    <Ionicons name="refresh" size={20} color="#059669" />
                                </TouchableOpacity>
                            </View>
                            
                            {clubs.map((club, index) => (
                                <ClubCard key={index} club={club} />
                            ))}
                            
                            {/* Add Club Button */}
                            <TouchableOpacity 
                                className="bg-green-600 rounded-2xl p-4 shadow-sm mt-4 mb-6"
                                onPress={openAddModal}
                            >
                                <View className="flex-row items-center justify-center">
                                    <Ionicons name="add-circle-outline" size={24} color="white" />
                                    <Text className="text-white font-bold ml-2">
                                        Add New Club
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </ScrollView>

            <AddClubModal 
                visible={showAddModal}
                onClose={closeAddModal}
                onSave={addClubs}
                clubs={newClubs}
                onUpdateClub={updateClub}
                onAddClubForm={addNewClubForm}
                onRemoveClubForm={removeClubForm}
                isLoading={addingClubs}
            />

            <EditClubModal 
                visible={showEditModal}
                onClose={closeEditModal}
                onSave={updateExistingClub}
                club={editingClub}
                onUpdateClub={updateEditingClub}
                isLoading={updatingClub}
            />
        </SafeAreaView>
    )
} 