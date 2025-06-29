"use client"

import { debugLog, debugError } from "../utils/debug"

// Sử dụng đúng biến môi trường đã định nghĩa trong .env.local và .env.production
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export class ApiError extends Error {
  status: number
  isNetworkError: boolean
  data: any

  constructor(message: string, status: number = 500, isNetworkError: boolean = false, data: any = null) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.isNetworkError = isNetworkError
    this.data = data
  }
}

interface ApiRequestOptions extends RequestInit {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body?: any
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: ApiRequestOptions = {},
  { skipAuth = false, suppressErrors = false }: { skipAuth?: boolean, suppressErrors?: boolean } = {}
): Promise<T | null> {
  if (!API_BASE_URL) {
    throw new Error("NEXT_PUBLIC_API_URL is not defined. Please check your .env file.");
  }

  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  const headers: Record<string, string> = { ...(options.headers as Record<string, string> || {}) };
  
  // Tự động thêm Authorization header nếu có token và không skipAuth
  if (token && !skipAuth) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  const fetchOptions: RequestInit = {
    ...options,
    headers,
  }

  // Xử lý body là object (JSON)
  if (
    fetchOptions.body &&
    typeof fetchOptions.body === "object" &&
    !(fetchOptions.body instanceof FormData) &&
    !headers["Content-Type"]
  ) {
    headers["Content-Type"] = "application/json";
    fetchOptions.body = JSON.stringify(fetchOptions.body);
  }

  debugLog(`API Request: ${fetchOptions.method || 'GET'} ${API_BASE_URL}${endpoint}`);

  let response: Response;
  
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, fetchOptions);
  } catch (error) {
    if (!suppressErrors) {
      debugError(`Network error fetching ${endpoint}:`, error);
    }
    throw new ApiError("Lỗi kết nối mạng, vui lòng kiểm tra lại.", 0, true);
  }

  if (response.status === 401 && !skipAuth) {
    debugLog("Unauthorized access (401). Redirecting to login.");
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      window.location.href = "/auth/login?session_expired=true";
    }
    // Ném lỗi để dừng các xử lý tiếp theo
    throw new ApiError("Phiên đăng nhập đã hết hạn.", 401);
  }

  if (!response.ok) {
    let errorData = null;
    let errorMessage = `Lỗi API: ${response.status} ${response.statusText}`;
    
    // Chỉ đọc body một lần duy nhất
    const responseClone = response.clone();
    try {
      errorData = await response.json();
      errorMessage = errorData.detail || JSON.stringify(errorData);
    } catch (e) {
      try {
        errorMessage = await responseClone.text();
      } catch (textError) {
        debugError("Không thể đọc nội dung lỗi:", textError);
      }
    }
    
    if (!suppressErrors) {
      debugError(`API call to ${endpoint} failed with status ${response.status}:`, errorMessage);
    }
    
    throw new ApiError(errorMessage, response.status, false, errorData);
  }

  // Xử lý response không có nội dung (204 No Content)
  if (response.status === 204) {
    return null;
  }
  
  try {
    const data = await response.json();
    return data as T;
  } catch (e) {
    debugError("Lỗi khi parse JSON response:", e);
    // Có thể response là text (hiếm gặp với API chuẩn)
    const textData = await response.text();
    return textData as unknown as T;
  }
}
