// API client configuration

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

interface RequestConfig extends RequestInit {
  params?: Record<string, string>;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private buildUrl(endpoint: string, params?: Record<string, string>): string {
    const url = new URL(`${this.baseUrl}${endpoint}`, window.location.origin);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }
    return url.toString();
  }

  async get<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    const { params, ...rest } = config || {};
    const response = await fetch(this.buildUrl(endpoint, params), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      ...rest,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
  }

  async post<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<T> {
    const { params, ...rest } = config || {};
    const response = await fetch(this.buildUrl(endpoint, params), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
      ...rest,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
