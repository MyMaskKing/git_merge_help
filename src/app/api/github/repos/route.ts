import { NextResponse } from 'next/server'
import { GitHubClient } from '@/lib/github/api'

export async function GET(request: Request) {
  try {
    // 从请求头获取访问令牌
    const authHeader = request.headers.get('Authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new NextResponse(
        JSON.stringify({ error: 'Authorization token is required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    const token = authHeader.replace('Bearer ', '')
    
    // 创建GitHub客户端并获取仓库列表
    const github = new GitHubClient(token)
    const repositories = await github.getRepositories()
    
    return new NextResponse(
      JSON.stringify(repositories),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error('获取仓库列表失败:', error)
    return new NextResponse(
      JSON.stringify({ error: 'Failed to fetch repositories' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
} 