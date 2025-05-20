// 客户端GitHub认证处理

// GitHub OAuth应用配置
const GITHUB_CLIENT_ID = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID || 'Ov23lir6pzPjVmPUAZnS';
const GITHUB_OAUTH_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_PROXY_URL = 'https://cors-anywhere.herokuapp.com/https://github.com/login/oauth/access_token';
const REDIRECT_URI = process.env.NEXT_PUBLIC_GITHUB_REDIRECT_URI || window.location.origin;

// 生成随机状态用于防止CSRF攻击
export function generateState(): string {
  return Math.random().toString(36).substring(2);
}

// 保存状态到本地存储
export function saveState(state: string): void {
  localStorage.setItem('github_oauth_state', state);
}

// 验证状态
export function validateState(state: string): boolean {
  const savedState = localStorage.getItem('github_oauth_state');
  return savedState === state;
}

// 获取GitHub授权URL
export function getGitHubAuthUrl(): string {
  const state = generateState();
  saveState(state);
  
  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: 'repo',
    state,
  });
  
  return `${GITHUB_OAUTH_URL}?${params.toString()}`;
}

// 使用公共代理服务交换GitHub Code获取Token
// 注意：在实际生产环境中，这种方法不安全，因为client_secret会暴露
// 这里仅用于演示，真实项目应使用自己的后端服务或代理服务
export async function exchangeCodeForToken(code: string, clientSecret: string): Promise<string> {
  try {
    const response = await fetch(GITHUB_TOKEN_PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest', // 某些CORS代理需要此头
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: clientSecret,
        code,
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to exchange code for token');
    }
    
    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('获取访问令牌失败:', error);
    throw new Error('获取访问令牌失败');
  }
}

// 使用token获取当前用户信息
export async function getCurrentUser(token: string): Promise<any> {
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch user data');
    }
    
    return response.json();
  } catch (error) {
    console.error('获取用户信息失败:', error);
    throw new Error('获取用户信息失败');
  }
}

// 获取用户仓库列表
export async function getUserRepositories(token: string): Promise<any[]> {
  try {
    const response = await fetch('https://api.github.com/user/repos?per_page=100', {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch repositories');
    }
    
    return response.json();
  } catch (error) {
    console.error('获取仓库列表失败:', error);
    throw new Error('获取仓库列表失败');
  }
}

// 获取仓库分支列表
export async function getRepositoryBranches(token: string, owner: string, repo: string): Promise<string[]> {
  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/branches`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch branches');
    }
    
    const branches = await response.json();
    return branches.map((branch: any) => branch.name);
  } catch (error) {
    console.error('获取分支列表失败:', error);
    throw new Error('获取分支列表失败');
  }
} 