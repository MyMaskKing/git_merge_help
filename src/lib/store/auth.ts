import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { GitHubUser } from '@/lib/github/api'

interface AuthState {
  token: string | null
  user: GitHubUser | null
  setToken: (token: string | null) => void
  setUser: (user: GitHubUser | null) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setToken: (token) => set({ token }),
      setUser: (user) => set({ user }),
      logout: () => set({ token: null, user: null }),
    }),
    {
      name: 'auth-storage',
    }
  )
) 