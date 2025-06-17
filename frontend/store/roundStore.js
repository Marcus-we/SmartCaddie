import { create } from 'zustand'
import authStore from './authStore'
import { API_BASE_URL } from '../config/api'

const useRoundStore = create((set, get) => ({
  // Current round state
  currentRound: null,
  currentHole: 1,
  roundHistory: [],
  loading: false,
  error: null,

  // Course-related state
  availableCourses: [],
  selectedCourse: null,
  selectedTee: null,

  // Actions
  startRound: async () => {
    try {
      const { selectedCourse, selectedTee } = get()
      
      if (!selectedCourse || !selectedTee) {
        throw new Error('Please select a course and tee')
      }
      
      set({ loading: true, error: null })
      
      const { token } = authStore.getState()
      
      const response = await fetch(`${API_BASE_URL}/rounds/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          course_id: selectedCourse.id,
          tee_id: selectedTee.id,
          holes_config: selectedTee.holes
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to start round')
      }

      const round = await response.json()
      set({ 
        currentRound: round, 
        currentHole: 1,
        loading: false,
        selectedCourse: null,
        selectedTee: null
      })
      
      return round
    } catch (error) {
      set({ error: error.message, loading: false })
      throw error
    }
  },

  getActiveRound: async () => {
    try {
      set({ loading: true, error: null })
      
      const { token } = authStore.getState()
      
      const response = await fetch(`${API_BASE_URL}/rounds/active`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      })

      if (!response.ok) {
        throw new Error('Failed to get active round')
      }

      const round = await response.json()
      
      if (round) {
        // Find current hole (first incomplete hole or last hole)
        const currentHoleNumber = round.hole_scores.find(hole => hole.shots === 0)?.hole_number || round.total_holes
        
        set({ 
          currentRound: round, 
          currentHole: currentHoleNumber,
          loading: false 
        })
      } else {
        set({ currentRound: null, currentHole: 1, loading: false })
      }
      
      return round
    } catch (error) {
      set({ error: error.message, loading: false })
      throw error
    }
  },

  updateHoleScore: async (holeNumber, shots, par, notes = null) => {
    try {
      const { currentRound } = get()
      if (!currentRound) throw new Error('No active round')
      
      const { token } = authStore.getState()
      
      const response = await fetch(`${API_BASE_URL}/rounds/${currentRound.id}/hole/${holeNumber}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shots,
          par,
          notes
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to update hole score')
      }

      const updatedHoleScore = await response.json()
      
      // Update local state
      set(state => ({
        currentRound: {
          ...state.currentRound,
          hole_scores: state.currentRound.hole_scores.map(hole =>
            hole.hole_number === holeNumber 
              ? updatedHoleScore
              : hole
          ),
          // Recalculate totals
          total_shots: state.currentRound.hole_scores.reduce((sum, hole) => 
            sum + (hole.hole_number === holeNumber ? shots : hole.shots), 0
          ),
          total_par: state.currentRound.hole_scores.reduce((sum, hole) => 
            sum + (hole.hole_number === holeNumber ? par : hole.par), 0
          )
        }
      }))
      
      // Update score_relative_to_par
      const { currentRound: updatedRound } = get()
      set(state => ({
        currentRound: {
          ...state.currentRound,
          score_relative_to_par: updatedRound.total_shots - updatedRound.total_par
        }
      }))
      
      return updatedHoleScore
    } catch (error) {
      set({ error: error.message })
      throw error
    }
  },

  nextHole: () => {
    const { currentRound, currentHole } = get()
    if (currentRound && currentHole < currentRound.total_holes) {
      set({ currentHole: currentHole + 1 })
    }
  },

  previousHole: () => {
    const { currentHole } = get()
    if (currentHole > 1) {
      set({ currentHole: currentHole - 1 })
    }
  },

  setCurrentHole: (holeNumber) => {
    const { currentRound } = get()
    if (currentRound && holeNumber >= 1 && holeNumber <= currentRound.total_holes) {
      set({ currentHole: holeNumber })
    }
  },

  completeRound: async (notes = null) => {
    try {
      const { currentRound } = get()
      if (!currentRound) throw new Error('No active round')
      
      set({ loading: true, error: null })
      
      const { token } = authStore.getState()
      
      const response = await fetch(`${API_BASE_URL}/rounds/${currentRound.id}/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notes })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to complete round')
      }

      const completedRound = await response.json()
      
      set({ 
        currentRound: null, 
        currentHole: 1,
        loading: false 
      })
      
      return completedRound
    } catch (error) {
      set({ error: error.message, loading: false })
      throw error
    }
  },

  getRoundHistory: async (limit = 10, offset = 0) => {
    try {
      set({ loading: true, error: null })
      
      const { token } = authStore.getState()
      
      const response = await fetch(`${API_BASE_URL}/rounds/history?limit=${limit}&offset=${offset}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      })

      if (!response.ok) {
        throw new Error('Failed to get round history')
      }

      const rounds = await response.json()
      set({ roundHistory: rounds, loading: false })
      
      return rounds
    } catch (error) {
      set({ error: error.message, loading: false })
      throw error
    }
  },

  getRoundDetails: async (roundId) => {
    try {
      const { token } = authStore.getState()
      
      const response = await fetch(`${API_BASE_URL}/rounds/${roundId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      })

      if (!response.ok) {
        throw new Error('Failed to get round details')
      }

      return await response.json()
    } catch (error) {
      set({ error: error.message })
      throw error
    }
  },

  deleteRound: async (roundId) => {
    try {
      const { token } = authStore.getState()
      
      const response = await fetch(`${API_BASE_URL}/rounds/${roundId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to delete round')
      }

      // Remove from local state if it was in history
      set(state => ({
        roundHistory: state.roundHistory.filter(round => round.id !== roundId)
      }))
      
      return true
    } catch (error) {
      set({ error: error.message })
      throw error
    }
  },

  // Helper functions
  getCurrentHoleData: () => {
    const { currentRound, currentHole } = get()
    if (!currentRound) return null
    
    return currentRound.hole_scores.find(hole => hole.hole_number === currentHole)
  },

  getCurrentHoleShots: () => {
    const holeData = get().getCurrentHoleData()
    return holeData ? holeData.shots : 0
  },

  getCurrentHolePar: () => {
    const holeData = get().getCurrentHoleData()
    return holeData ? holeData.par : 4
  },

  getTotalShots: () => {
    const { currentRound } = get()
    return currentRound ? currentRound.total_shots : 0
  },

  getTotalPar: () => {
    const { currentRound } = get()
    return currentRound ? currentRound.total_par : 0
  },

  getScoreRelativeToPar: () => {
    const { currentRound } = get()
    return currentRound ? currentRound.score_relative_to_par : 0
  },

  // Clear error
  clearError: () => set({ error: null }),

  // Reset store
  reset: () => {
    set({
    currentRound: null,
    currentHole: 1,
    loading: false,
      error: null,
      selectedCourse: null,
      selectedTee: null,
      targetPosition: null,
      distance: 0
    })
  },

  // Course-related actions
  searchCourses: async (searchTerm) => {
    try {
      set({ loading: true, error: null })
      
      const { token } = authStore.getState()
      
      const response = await fetch(`${API_BASE_URL}/courses?search=${encodeURIComponent(searchTerm)}&use_meters=true`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      })

      if (!response.ok) {
        throw new Error('Failed to search courses')
      }

      const courses = await response.json()
      set({ availableCourses: courses, loading: false })
      
      return courses
    } catch (error) {
      set({ error: error.message, loading: false })
      throw error
    }
  },

  setSelectedCourse: (course) => {
    set({ selectedCourse: course, selectedTee: null })
  },

  setSelectedTee: (tee) => {
    set({ selectedTee: tee })
  },
}))

export default useRoundStore 