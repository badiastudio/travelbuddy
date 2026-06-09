import { create } from 'zustand';
import { Trip, TripMember } from '../types/app.types';

interface TripState {
  currentTrip: Trip | null;
  currentMembers: TripMember[];
  setCurrentTrip: (trip: Trip | null) => void;
  setCurrentMembers: (members: TripMember[]) => void;
}

export const useTripStore = create<TripState>((set) => ({
  currentTrip: null,
  currentMembers: [],
  setCurrentTrip: (trip) => set({ currentTrip: trip }),
  setCurrentMembers: (members) => set({ currentMembers: members }),
}));
