import { GITHUB_CONFIG } from '@/config/github'

export function getGitHubAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: GITHUB_CONFIG.clientId,
    redirect_uri: GITHUB_CONFIG.redirectUri,
    scope: GITHUB_CONFIG.scope,
    state: generateState(),
  })

  return `${GITHUB_CONFIG.authUrl}?${params.toString()}`
}

function generateState(): string {
  return Math.random().toString(36).substring(2)
}

export function validateState(state: string): boolean {
  // TODO: 实现状态验证逻辑
  return true
}

export async function exchangeCodeForToken(code: string): Promise<string> {
  // 注意：这个请求应该在服务器端完成，以保护client_secret
  const response = await fetch('/api/auth/github', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code }),
  })

  if (!response.ok) {
    throw new Error('Failed to exchange code for token')
  }

  const data = await response.json()
  return data.access_token
} 