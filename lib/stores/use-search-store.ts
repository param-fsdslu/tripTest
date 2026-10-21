import { create } from 'zustand'

// Separate state shape from actions for clarity
interface SearchStateData {
  location: string
  checkIn: Date | undefined
  checkOut: Date | undefined
  adults: number
  children: number
  rooms: number
  boatDate: Date | undefined
  activeTab: 'hotels' | 'boats'
  isGuestOpen: boolean
}

interface SearchActions {
  setLocation: (location: string) => void
  setCheckIn: (date: Date | undefined) => void
  setCheckOut: (date: Date | undefined) => void
  setDateRange: (checkIn: Date | undefined, checkOut: Date | undefined) => void
  setAdults: (adults: number) => void
  setChildren: (children: number) => void
  setRooms: (rooms: number) => void
  setBoatDate: (date: Date | undefined) => void
  setActiveTab: (tab: 'hotels' | 'boats') => void
  setIsGuestOpen: (open: boolean) => void
  resetSearch: () => void
  hydrateFromParams: (params: Record<string, string | undefined>) => void
}

export type SearchState = SearchStateData & SearchActions

const initialState: SearchStateData = {
  location: 'Honnavar',
  checkIn: undefined,
  checkOut: undefined,
  adults: 2,
  children: 0,
  rooms: 1,
  boatDate: undefined,
  activeTab: 'hotels',
  isGuestOpen: false,
}

export const useSearchStore = create<SearchState>()((set) => ({
  ...initialState,

  setLocation: (location) => set({ location }),
  setCheckIn: (checkIn) => set({ checkIn }),
  setCheckOut: (checkOut) => set({ checkOut }),
  setDateRange: (checkIn, checkOut) => set({ checkIn, checkOut }),
  setAdults: (adults) => set({ adults }),
  setChildren: (children) => set({ children }),
  setRooms: (rooms) => set({ rooms }),
  setBoatDate: (boatDate) => set({ boatDate }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setIsGuestOpen: (isGuestOpen) => set({ isGuestOpen }),
  resetSearch: () => set(initialState),

  hydrateFromParams: (params) =>
    set({
      location: params.location || initialState.location,
      checkIn: params.checkIn ? new Date(params.checkIn) : undefined,
      checkOut: params.checkOut ? new Date(params.checkOut) : undefined,
      adults: params.adults ? Number(params.adults) : initialState.adults,
      children: params.children ? Number(params.children) : initialState.children,
      rooms: params.rooms ? Number(params.rooms) : initialState.rooms,
    }),
}))
