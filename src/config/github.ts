export const GITHUB_CONFIG = {
  clientId: process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID || '',
  redirectUri: process.env.NEXT_PUBLIC_GITHUB_REDIRECT_URI || '',
  scope: 'repo',
  authUrl: 'https://github.com/login/oauth/authorize',
}

export const GITHUB_API = {
  baseUrl: 'https://api.github.com',
  endpoints: {
    user: '/user',
    repos: '/user/repos',
  },
} 