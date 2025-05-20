'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { useAuthStore } from '@/lib/store/auth';
import { Autocomplete } from '@/components/ui/autocomplete';
import { GitBrowserClient } from '@/lib/git/browser-client';
import { ConflictResolver } from '@/components/git/ConflictResolver';
import { Toast } from '@/components/ui/Toast';

export default function Home() {
  const { token, user } = useAuthStore();
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
  const [message, setMessage] = useState('');
  const [mergeLoading, setMergeLoading] = useState(false);
  const [mergeResult, setMergeResult] = useState<string>('');
  const [gitClient, setGitClient] = useState<GitBrowserClient | null>(null);
  const [conflictFiles, setConflictFiles] = useState<string[]>([]);
  const [showConflictResolver, setShowConflictResolver] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');
  const [commitLoading, setCommitLoading] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
    visible: boolean;
  } | null>(null);
  
  // 获取用户的仓库列表
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
  
  async function fetchUserRepositories() {
    setIsLoading(true);
    try {
      // 使用GitHub REST API直接从前端获取仓库列表
      const response = await fetch('https://api.github.com/user/repos?per_page=100', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch repositories');
      }
      
      const repos = await response.json();
      setRepositories(repos.map((repo: any) => ({
        full_name: repo.full_name,
        owner: repo.full_name.split('/')[0],
        name: repo.full_name.split('/')[1],
      })));
    } catch (error) {
      console.error('获取仓库列表失败', error);
      showToast('获取仓库列表失败', 'error');
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchBranches() {
    if (!selectedRepo || !token) return;
    
    setIsLoading(true);
    setSourceBranches([]);
    setTargetBranches([]);
    
    try {
      const selectedRepoInfo = repositories.find(repo => repo.full_name === selectedRepo);
      if (!selectedRepoInfo) return;
      
      const { owner, name } = selectedRepoInfo;
      
      // 使用GitHub REST API直接从前端获取分支列表
      const response = await fetch(`https://api.github.com/repos/${owner}/${name}/branches`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch branches');
      }
      
      const branchesData = await response.json();
      const branches = branchesData.map((branch: any) => branch.name);
      
      setSourceBranches(branches);
      setTargetBranches(branches);
    } catch (error) {
      console.error('获取分支列表失败', error);
      showToast('获取分支列表失败', 'error');
    } finally {
      setIsLoading(false);
    }
  }

  function handleRepoChange(newRepo: string) {
    setSelectedRepo(newRepo);
    // 清空分支选择
    setSourceBranch('');
    setTargetBranch('');
    setGitClient(null); // 重置Git客户端
  }

  // 初始化Git客户端
  async function initGitClient() {
    if (!token) return null;
    
    const repoUrl = isCustomRepo 
      ? customRepo
      : `https://github.com/${repositories.find(r => r.full_name === selectedRepo)?.full_name}.git`;
      
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

  // 显示Toast通知
  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type, visible: true });
  };

  // 隐藏Toast通知
  const hideToast = () => {
    setToast(null);
  };

  // 执行Pull操作
  async function handlePull() {
    if (!token || !sourceBranch) return;
    
    setPullLoading(true);
    setMessage('');
    
    try {
      // 初始化Git客户端
      let client = gitClient;
      if (!client) {
        client = await initGitClient();
        if (!client) throw new Error('无法初始化Git客户端');
      }
      
      // 执行拉取操作
      await client.pull(sourceBranch);
      setMessage(`成功从 ${sourceBranch} 拉取最新代码`);
      showToast(`成功从 ${sourceBranch} 拉取最新代码`, 'success');
    } catch (error) {
      console.error('Pull操作失败:', error);
      setMessage('拉取操作失败，请查看控制台获取详细信息');
      showToast('拉取操作失败', 'error');
    } finally {
      setPullLoading(false);
    }
  }

  // 执行合并操作
  async function handleMerge() {
    if (!token || !sourceBranch || !targetBranch) return;
    
    setMergeLoading(true);
    setMergeResult('');
    setConflictFiles([]);
    setShowConflictResolver(false);
    
    try {
      // 初始化Git客户端
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
        // 设置默认提交信息
        setCommitMessage(`Merge branch '${sourceBranch}' into ${targetBranch}`);
        showToast('合并成功，没有冲突', 'success');
      } else if (result.conflicts && result.conflicts.length > 0) {
        let conflictOutput = `\n// 合并过程中发现冲突！\n// 冲突文件:\n`;
        for (const file of result.conflicts) {
          conflictOutput += `// - ${file}\n`;
        }
        setMergeResult(prev => prev + conflictOutput + `\n// 请解决冲突后继续\n`);
        
        // 保存冲突文件列表并显示解决器
        setConflictFiles(result.conflicts);
        setShowConflictResolver(true);
        showToast(`发现 ${result.conflicts.length} 个冲突文件，请解决`, 'info');
      } else {
        setMergeResult(prev => prev + `\n// 合并失败: ${result.error || '未知错误'}\n`);
        showToast('合并失败', 'error');
      }
    } catch (error) {
      console.error('合并操作失败:', error);
      setMergeResult(`// 合并失败\n// ${error instanceof Error ? error.message : '未知错误'}`);
      showToast('合并操作失败', 'error');
    } finally {
      setMergeLoading(false);
    }
  }

  // 处理冲突解决完成
  async function handleConflictsResolved() {
    setShowConflictResolver(false);
    setMergeResult(prev => prev + `\n// 所有冲突已解决！\n// 可以提交更改了\n`);
    // 设置默认提交信息
    setCommitMessage(`Merge branch '${sourceBranch}' into ${targetBranch}`);
    showToast('所有冲突已解决', 'success');
  }

  // 提交合并更改
  async function handleCommitMerge() {
    if (!gitClient || !commitMessage) return;
    
    setCommitLoading(true);
    
    try {
      const sha = await gitClient.commit(commitMessage);
      setMergeResult(prev => prev + `\n// 更改已提交: ${sha.substring(0, 7)}\n`);
      showToast('更改已提交', 'success');
      
      // 尝试推送更改
      setMergeResult(prev => prev + `\n// 正在推送更改...\n`);
      await gitClient.push();
      setMergeResult(prev => prev + `\n// 推送成功！合并完成。\n`);
      showToast('合并完成并推送成功', 'success');
    } catch (error) {
      console.error('提交或推送失败:', error);
      setMergeResult(prev => prev + `\n// 提交或推送失败: ${error instanceof Error ? error.message : '未知错误'}\n`);
      showToast('提交或推送失败', 'error');
    } finally {
      setCommitLoading(false);
    }
  }

  // 获取仓库名称列表，用于自动完成
  const repoNames = repositories.map(repo => repo.full_name);

  return (
    <div className="max-w-5xl mx-auto p-8">
      <Header />
      
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
      
      {showConflictResolver && gitClient && (
        <div className="mt-6">
          <ConflictResolver 
            client={gitClient}
            conflictFiles={conflictFiles}
            onResolved={handleConflictsResolved}
            onCancel={() => setShowConflictResolver(false)}
          />
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-md p-6 mt-6">
        <h2 className="text-xl font-semibold mb-4">合并结果</h2>
        <div className="bg-gray-900 text-white p-4 rounded-md font-mono text-sm h-60 overflow-auto">
          <pre>{mergeResult || `// 合并结果将显示在这里`}</pre>
        </div>
        
        {!showConflictResolver && conflictFiles.length === 0 && mergeResult.includes('成功') && (
          <div className="mt-4">
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">提交信息:</label>
              <input 
                type="text"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
                placeholder="输入提交信息"
              />
            </div>
            <button
              onClick={handleCommitMerge}
              disabled={commitLoading || !commitMessage}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {commitLoading ? '提交中...' : '提交并推送更改'}
            </button>
          </div>
        )}
      </div>
      
      {toast && toast.visible && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={hideToast} 
        />
      )}
    </div>
  )
} 