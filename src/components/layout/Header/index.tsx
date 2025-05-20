'use client';

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/lib/store/auth'
import { getGitHubAuthUrl, exchangeCodeForToken } from '@/lib/github/auth'
import { GitHubClient } from '@/lib/github/api'

export function Header() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { token, user, setToken, setUser, logout } = useAuthStore()

  useEffect(() => {
    if (!searchParams) return
    const code = searchParams.get('code')
    if (code && !token) {
      handleGitHubCallback(code)
    }
  }, [searchParams, token])

  async function handleGitHubCallback(code: string) {
    try {
      const accessToken = await exchangeCodeForToken(code)
      setToken(accessToken)

      const github = new GitHubClient(accessToken)
      const userData = await github.getCurrentUser()
      setUser(userData)

      // 清除URL中的code参数
      router.replace('/')
    } catch (error) {
      console.error('GitHub认证失败:', error)
      logout()
    }
  }

  function handleLogin() {
    window.location.href = getGitHubAuthUrl()
  }

  return (
    <header className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
      <div className="flex items-center gap-2">
        <img src="https://github.githubassets.com/favicons/favicon.svg" alt="GitHub Logo" className="w-10 h-10" />
        <h1 className="text-2xl font-bold">Git Merge Manager</h1>
      </div>
      <div>
        {user ? (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-full">
              <img
                src={user.avatar_url}
                alt={user.name || user.login}
                className="w-8 h-8 rounded-full"
              />
              <span>{user.name || user.login}</span>
            </div>
            <button 
              onClick={logout}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100"
            >
              退出登录
            </button>
          </div>
        ) : (
          <button 
            onClick={handleLogin}
            className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-gray-800"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 0C4.477 0 0 4.477 0 10c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V19c0 .27.16.59.67.5C17.14 18.16 20 14.42 20 10A10 10 0 0010 0z" clipRule="evenodd"></path>
            </svg>
            GitHub登录
          </button>
        )}
      </div>
    </header>
  )
} 