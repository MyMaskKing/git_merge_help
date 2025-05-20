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
    
    // 从URL获取仓库所有者和名称
    const url = new URL(request.url)
    const owner = url.searchParams.get('owner')
    const repo = url.searchParams.get('repo')
    
    if (!owner || !repo) {
      return new NextResponse(
        JSON.stringify({ error: 'Owner and repo parameters are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    // 创建GitHub客户端并获取分支列表
    const github = new GitHubClient(token)
    const branches = await github.getBranches(owner, repo)
    
    return new NextResponse(
      JSON.stringify(branches),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error('获取分支列表失败:', error)
    return new NextResponse(
      JSON.stringify({ error: 'Failed to fetch branches' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
} 