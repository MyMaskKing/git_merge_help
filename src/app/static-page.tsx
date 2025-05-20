'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Autocomplete } from '@/components/ui/autocomplete';
import * as clientAuth from '@/lib/github/client-auth';
import { GitBrowserClient } from '@/lib/git/browser-client';

// 注意：在生产环境中，不应该在客户端代码中包含这个密钥
// 这仅用于演示目的，实际应该由后端服务器处理
// 由于这是纯静态页面的演示，我们仍然在客户端使用它
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || '09cfb059c32b8a048323519d5f1446c7701b9580';

export default function StaticPage() {
  // URL参数处理
  const searchParams = useSearchParams();
  
  // 状态管理
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [repositories, setRepositories] = useState<Array<{full_name: string, owner: string, name: string}>>([]);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [customRepo, setCustomRepo] = useState('');
  const [isCustomRepo, setIsCustomRepo] = useState(false);
  const [sourceBranches, setSourceBranches] = useState<string[]>([]);
  const [targetBranches, setTargetBranches] = useState<string[]>([]);
  const [sourceBranch, setSourceBranch] = useState('');
  const [targetBranch, setTargetBranch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pullLoading, setPullLoading] = useState(false);
  const [mergeLoading, setMergeLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [mergeResult, setMergeResult] = useState<string>('');
  const [gitClient, setGitClient] = useState<GitBrowserClient | null>(null);
  
  // 加载保存的token
  useEffect(() => {
    const savedToken = localStorage.getItem('github_token');
    if (savedToken) {
      setToken(savedToken);
    }
  }, []);
  
  // 处理GitHub认证回调
  useEffect(() => {
    const code = searchParams?.get('code');
    const state = searchParams?.get('state');
    
    if (code && state && clientAuth.validateState(state)) {
      handleGitHubCallback(code);
    }
  }, [searchParams]);
  
  // 获取用户信息
  useEffect(() => {
    if (token) {
      fetchUserInfo();
    }
  }, [token]);
  
  // 获取用户仓库
  useEffect(() => {
    if (token && user) {
      fetchUserRepositories();
    }
  }, [token, user]);
  
  // 当选择仓库改变时，获取分支列表
  useEffect(() => {
    if (selectedRepo && !isCustomRepo) {
      fetchBranches();
    }
  }, [selectedRepo]);
  
  // GitHub认证回调处理
  async function handleGitHubCallback(code: string) {
    setIsLoading(true);
    try {
      const accessToken = await clientAuth.exchangeCodeForToken(code, CLIENT_SECRET);
      setToken(accessToken);
      localStorage.setItem('github_token', accessToken);
      
      // 清除URL中的code参数
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (error) {
      console.error('GitHub认证失败:', error);
      setMessage('GitHub认证失败，请重试');
    } finally {
      setIsLoading(false);
    }
  }
  
  // 获取用户信息
  async function fetchUserInfo() {
    if (!token) return;
    
    setIsLoading(true);
    try {
      const userData = await clientAuth.getCurrentUser(token);
      setUser(userData);
    } catch (error) {
      console.error('获取用户信息失败:', error);
      setMessage('获取用户信息失败');
      logout();
    } finally {
      setIsLoading(false);
    }
  }
  
  // 获取用户仓库列表
  async function fetchUserRepositories() {
    if (!token) return;
    
    setIsLoading(true);
    try {
      const repos = await clientAuth.getUserRepositories(token);
      setRepositories(repos.map((repo: any) => ({
        full_name: repo.full_name,
        owner: repo.full_name.split('/')[0],
        name: repo.full_name.split('/')[1],
      })));
    } catch (error) {
      console.error('获取仓库列表失败:', error);
      setMessage('获取仓库列表失败');
    } finally {
      setIsLoading(false);
    }
  }
  
  // 获取分支列表
  async function fetchBranches() {
    if (!selectedRepo || !token) return;
    
    setIsLoading(true);
    setSourceBranches([]);
    setTargetBranches([]);
    
    try {
      const selectedRepoInfo = repositories.find(repo => repo.full_name === selectedRepo);
      if (!selectedRepoInfo) return;
      
      const { owner, name } = selectedRepoInfo;
      const branches = await clientAuth.getRepositoryBranches(token, owner, name);
      setSourceBranches(branches);
      setTargetBranches(branches);
    } catch (error) {
      console.error('获取分支列表失败:', error);
      setMessage('获取分支列表失败');
    } finally {
      setIsLoading(false);
    }
  }
  
  // 初始化Git客户端
  async function initGitClient() {
    if (!token) return null;
    
    const repoUrl = isCustomRepo 
      ? customRepo
      : `https://github.com/${selectedRepo}.git`;
      
    const client = new GitBrowserClient({
      token,
      repoUrl,
    });
    
    try {
      await client.init();
      setGitClient(client);
      return client;
    } catch (error) {
      console.error('初始化Git客户端失败:', error);
      setMessage('初始化Git客户端失败');
      return null;
    }
  }
  
  // 执行Pull操作
  async function handlePull() {
    if (!token || !sourceBranch) return;
    
    setPullLoading(true);
    setMessage('');
    
    try {
      let client = gitClient;
      if (!client) {
        client = await initGitClient();
        if (!client) throw new Error('无法初始化Git客户端');
      }
      
      await client.pull(sourceBranch);
      setMessage(`成功从 ${sourceBranch} 拉取最新代码`);
    } catch (error) {
      console.error('Pull操作失败:', error);
      setMessage('拉取操作失败，请查看控制台获取详细信息');
    } finally {
      setPullLoading(false);
    }
  }
  
  // 执行合并操作
  async function handleMerge() {
    if (!token || !sourceBranch || !targetBranch) return;
    
    setMergeLoading(true);
    setMergeResult('');
    
    try {
      let client = gitClient;
      if (!client) {
        client = await initGitClient();
        if (!client) throw new Error('无法初始化Git客户端');
      }
      
      // 显示合并进度
      setMergeResult(`// 正在将分支 ${sourceBranch} 合并到 ${targetBranch}...\n`);
      
      // 执行合并
      const result = await client.merge(sourceBranch, targetBranch);
      
      if (result.success) {
        setMergeResult(prev => prev + `\n// 合并成功！\n// 没有发现冲突。\n`);
      } else if (result.conflicts && result.conflicts.length > 0) {
        let conflictOutput = `\n// 合并过程中发现冲突！\n// 冲突文件:\n`;
        for (const file of result.conflicts) {
          conflictOutput += `// - ${file}\n`;
        }
        setMergeResult(prev => prev + conflictOutput + `\n// 请解决冲突后继续\n`);
      } else {
        setMergeResult(prev => prev + `\n// 合并失败: ${result.error || '未知错误'}\n`);
      }
    } catch (error) {
      console.error('合并操作失败:', error);
      setMergeResult(`// 合并失败\n// ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setMergeLoading(false);
    }
  }
  
  // 退出登录
  function logout() {
    setToken(null);
    setUser(null);
    setGitClient(null);
    localStorage.removeItem('github_token');
  }
  
  function handleRepoChange(newRepo: string) {
    setSelectedRepo(newRepo);
    setSourceBranch('');
    setTargetBranch('');
    setGitClient(null);
  }
  
  // 获取仓库名称列表，用于自动完成
  const repoNames = repositories.map(repo => repo.full_name);
  
  // 处理GitHub登录
  function handleLogin() {
    window.location.href = clientAuth.getGitHubAuthUrl();
  }

  return (
    <div className="max-w-5xl mx-auto p-8">
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
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Git仓库</h2>
        <div className="bg-gray-50 p-4 rounded-md mb-6">
          <div className="mb-4">
            <div className="flex items-center mb-2">
              <input 
                type="radio" 
                id="selectRepo" 
                name="repoType" 
                checked={!isCustomRepo} 
                onChange={() => setIsCustomRepo(false)}
                className="mr-2"
              />
              <label htmlFor="selectRepo" className="text-sm font-medium">从我的仓库中选择:</label>
            </div>
            <Autocomplete
              options={repoNames}
              placeholder="搜索或选择一个仓库"
              value={selectedRepo}
              onChange={handleRepoChange}
              disabled={isCustomRepo || isLoading || repositories.length === 0}
            />
            {token && isLoading && (
              <p className="text-sm text-gray-500 mt-1">加载中...</p>
            )}
            {token && !isLoading && repositories.length === 0 && (
              <p className="text-sm text-gray-500 mt-1">未找到仓库</p>
            )}
            {!token && (
              <p className="text-sm text-gray-500 mt-1">请先登录GitHub账号</p>
            )}
          </div>
          
          <div className="mb-4">
            <div className="flex items-center mb-2">
              <input 
                type="radio" 
                id="customRepo" 
                name="repoType" 
                checked={isCustomRepo}
                onChange={() => setIsCustomRepo(true)}
                className="mr-2"
              />
              <label htmlFor="customRepo" className="text-sm font-medium">手动输入仓库地址:</label>
            </div>
            <input 
              type="text" 
              className="w-full p-2 border border-gray-300 rounded-md"
              placeholder="例如: https://github.com/username/repo.git"
              disabled={!isCustomRepo}
              value={customRepo}
              onChange={(e) => setCustomRepo(e.target.value)}
            />
          </div>
        </div>
      
        <h2 className="text-xl font-semibold mb-4">选择分支</h2>
        <div className="bg-gray-50 p-4 rounded-md">
          <div className="mb-4">
            <label className="block mb-2 text-sm font-medium">源分支:</label>
            <div className="flex space-x-2">
              <Autocomplete
                options={sourceBranches}
                placeholder="搜索或选择源分支"
                value={sourceBranch}
                onChange={setSourceBranch}
                disabled={!selectedRepo || isLoading || sourceBranches.length === 0}
                className="flex-1"
              />
              <button 
                className="bg-blue-500 text-white px-3 py-2 rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
                disabled={!selectedRepo || !sourceBranch || pullLoading}
                onClick={handlePull}
              >
                {pullLoading ? (
                  <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                )}
                Pull
              </button>
            </div>
            {message && (
              <p className={`text-sm mt-1 ${message.includes('失败') ? 'text-red-500' : 'text-green-500'}`}>
                {message}
              </p>
            )}
            {selectedRepo && isLoading && (
              <p className="text-sm text-gray-500 mt-1">加载分支中...</p>
            )}
          </div>
          
          <div className="mb-4">
            <label className="block mb-2 text-sm font-medium">目标分支:</label>
            <Autocomplete
              options={targetBranches}
              placeholder="搜索或选择目标分支"
              value={targetBranch}
              onChange={setTargetBranch}
              disabled={!selectedRepo || isLoading || targetBranches.length === 0}
            />
          </div>
          
          <button 
            className="bg-blue-600 text-white font-medium px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
            disabled={!selectedRepo || !sourceBranch || !targetBranch || isLoading || mergeLoading}
            onClick={handleMerge}
          >
            {mergeLoading ? (
              <>
                <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                处理中...
              </>
            ) : (
              "开始合并"
            )}
          </button>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">合并结果</h2>
        <div className="bg-gray-900 text-white p-4 rounded-md font-mono text-sm h-60 overflow-auto">
          <pre>{mergeResult || `// 合并结果将显示在这里`}</pre>
        </div>
      </div>
      
      <div className="mt-8 text-center text-sm text-gray-500">
        <p>这是一个纯前端的Git合并管理工具，所有操作在浏览器中执行</p>
        <p className="mt-1">适合部署在GitHub Pages或Cloudflare Pages等静态托管平台</p>
      </div>
    </div>
  );
} 