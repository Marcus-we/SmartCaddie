import { create } from "zustand";

const useRegistrationStore = create((set, get) => ({
  step: 1,
  userData: {
    email: '',
    firstName: '',
    lastName: '',
    password: '',
  },
  clubsData: [{
    club: '',
    distance_meter: '',
    preferred_club: false
  }],
  handicapData: {
    initialHandicap: 54.0,
  },
  
  setStep: (step) => set({ step }),
  
  setUserData: (data) => set((state) => ({
    userData: { ...state.userData, ...data }
  })),
  
  setClubsData: (clubs) => set({ clubsData: clubs }),
  
  addClub: () => set((state) => ({
    clubsData: [...state.clubsData, {
      club: '',
      distance_meter: '',
      preferred_club: false
    }]
  })),
  
  removeClub: (index) => set((state) => ({
    clubsData: state.clubsData.filter((_, i) => i !== index)
  })),
  
  updateClub: (index, field, value) => set((state) => {
    const updatedClubs = [...state.clubsData];
    updatedClubs[index] = { ...updatedClubs[index], [field]: value };
    return { clubsData: updatedClubs };
  }),
  
  setHandicapData: (handicap) => set((state) => ({
    handicapData: { ...state.handicapData, ...handicap }
  })),
  
  resetRegistration: () => set({
    step: 1,
    userData: {
      email: '',
      firstName: '',
      lastName: '',
      password: '',
    },
    clubsData: [{
      club: '',
      distance_meter: '',
      preferred_club: false
    }],
    handicapData: {
      initialHandicap: 54.0,
    },
  }),
}));

export default useRegistrationStore; 