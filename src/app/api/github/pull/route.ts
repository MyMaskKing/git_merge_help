import { NextResponse } from 'next/server'
import { GitClient } from '@/lib/git/client'

export async function POST(request: Request) {
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
    
    // 从请求体获取仓库和分支信息
    const { repoUrl, branch } = await request.json()
    
    if (!repoUrl || !branch) {
      return new NextResponse(
        JSON.stringify({ error: 'Repository URL and branch are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    // 创建Git客户端并执行pull操作
    const gitClient = new GitClient({
      repoUrl,
      token,
    })
    
    // 执行pull操作
    await gitClient.pull(branch)
    
    return new NextResponse(
      JSON.stringify({ success: true, message: `Successfully pulled from ${branch}` }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error('Pull操作失败:', error)
    return new NextResponse(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Pull operation failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
} 