import { GITHUB_API } from '@/config/github'

export interface GitHubUser {
  login: string
  name: string | null
  avatar_url: string
}

export interface GitHubRepo {
  id: number
  name: string
  full_name: string
  private: boolean
  description: string | null
  default_branch: string
}

export class GitHubClient {
  private token: string
  private baseUrl: string

  constructor(token: string) {
    this.token = token
    this.baseUrl = GITHUB_API.baseUrl
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/vnd.github.v3+json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`)
    }

    return response.json()
  }

  async getCurrentUser(): Promise<GitHubUser> {
    return this.request<GitHubUser>(GITHUB_API.endpoints.user)
  }

  async getRepositories(): Promise<GitHubRepo[]> {
    return this.request<GitHubRepo[]>(GITHUB_API.endpoints.repos)
  }

  async getBranches(owner: string, repo: string): Promise<string[]> {
    const branches = await this.request<Array<{ name: string }>>(`/repos/${owner}/${repo}/branches`)
    return branches.map(branch => branch.name)
  }
} 