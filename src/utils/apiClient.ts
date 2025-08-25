// Enhanced API client for multi-tier role system
class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('access_token') || localStorage.getItem('contestlet-admin-token');
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired or invalid
        localStorage.removeItem('access_token');
        localStorage.removeItem('contestlet-admin-token');
        window.location.href = '/admin';
        throw new Error('Authentication required');
      }
      
      if (response.status === 403) {
        throw new Error('Access denied - insufficient permissions');
      }

      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Authentication
  async requestOTP(phone: string) {
    return this.request('/auth/request-otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  }

  async verifyOTP(phone: string, code: string) {
    const response = await this.request<{
      access_token: string;
      user_id: number;
      phone: string;
      role: string;
    }>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, code }),
    });

    // Store token and update client
    this.token = response.access_token;
    localStorage.setItem('access_token', response.access_token);

    return response;
  }

  // User endpoints
  async getUserProfile() {
    return this.request('/user/profile');
  }

  async getUserEntries() {
    return this.request('/user/entries');
  }

  async getUserStats() {
    return this.request('/user/stats');
  }

  async getAvailableContests() {
    return this.request('/user/contests/available');
  }

  async enterContest(contestId: number) {
    return this.request(`/user/contests/${contestId}/enter`, {
      method: 'POST',
    });
  }

  // Sponsor endpoints
  async getSponsorProfile() {
    return this.request('/sponsor/profile');
  }

  async updateSponsorProfile(data: any) {
    return this.request('/sponsor/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getSponsorContests() {
    return this.request('/sponsor/contests');
  }

  async createSponsorContest(contestData: any) {
    return this.request('/sponsor/contests', {
      method: 'POST',
      body: JSON.stringify(contestData),
    });
  }

  async getSponsorAnalytics() {
    return this.request('/sponsor/analytics');
  }

  async requestSponsorUpgrade(upgradeData: any) {
    return this.request('/sponsor/upgrade-request', {
      method: 'POST',
      body: JSON.stringify(upgradeData),
    });
  }

  // Admin endpoints (existing ones)
  async getAdminContests() {
    return this.request('/admin/contests');
  }

  async approveContest(contestId: number, action: 'approved' | 'rejected', reason?: string) {
    return this.request(`/admin/contests/${contestId}/approve`, {
      method: 'PUT',
      body: JSON.stringify({ action, reason }),
    });
  }

  async assignUserRole(userId: number, role: string, reason: string) {
    return this.request(`/admin/users/${userId}/assign-role`, {
      method: 'POST',
      body: JSON.stringify({ role, reason }),
    });
  }

  // Legacy admin endpoints (for backward compatibility)
  async getAdminContestsLegacy() {
    return this.request('/admin/contests');
  }

  async createContest(contestData: any) {
    return this.request('/admin/contests', {
      method: 'POST',
      body: JSON.stringify(contestData),
    });
  }

  async updateContest(contestId: number, contestData: any) {
    return this.request(`/admin/contests/${contestId}`, {
      method: 'PUT',
      body: JSON.stringify(contestData),
    });
  }

  async deleteContest(contestId: number) {
    return this.request(`/admin/contests/${contestId}`, {
      method: 'DELETE',
    });
  }
}

export const apiClient = new ApiClient(process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000');
