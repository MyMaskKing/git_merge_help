import { NextResponse } from 'next/server'

// GitHub OAuth 配置
const GITHUB_CLIENT_ID = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token'

export async function POST(request: Request) {
  try {
    const { code } = await request.json()

    if (!code) {
      return new NextResponse(
        JSON.stringify({ error: 'Authorization code is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
      console.error('GitHub client ID or secret not configured')
      return new NextResponse(
        JSON.stringify({ error: 'OAuth configuration error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 向 GitHub 交换授权码获取访问令牌
    const response = await fetch(GITHUB_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
      }),
    })

    const data = await response.json()

    if (data.error) {
      console.error('GitHub OAuth error:', data.error)
      return new NextResponse(
        JSON.stringify({ error: data.error_description || 'OAuth exchange failed' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new NextResponse(
      JSON.stringify({ access_token: data.access_token }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('GitHub auth handler error:', error)
    return new NextResponse(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
} 