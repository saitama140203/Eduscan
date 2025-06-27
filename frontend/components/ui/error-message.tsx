import React from "react";
import { AlertTriangle, WifiOff, ServerOff, AlertCircle, HelpCircle, Globe } from "lucide-react";

interface ErrorMessageProps {
  title?: string;
  message: string;
  errorType?: "network" | "server" | "validation" | "auth" | "unknown" | "cors";
  suggestion?: string;
  className?: string;
  showSolutions?: boolean;
}

export function ErrorMessage({
  title,
  message,
  errorType = "unknown",
  suggestion,
  className = "",
  showSolutions = true,
}: ErrorMessageProps) {
  // Chọn icon dựa vào loại lỗi
  const Icon = React.useMemo(() => {
    switch (errorType) {
      case "network":
        return WifiOff;
      case "server":
        return ServerOff;
      case "validation":
        return AlertTriangle;
      case "auth":
        return AlertCircle;
      case "cors":
        return Globe;
      case "unknown":
      default:
        return HelpCircle;
    }
  }, [errorType]);

  // Tạo tiêu đề mặc định nếu không được cung cấp
  const defaultTitle = React.useMemo(() => {
    switch (errorType) {
      case "network":
        return "Lỗi kết nối";
      case "server":
        return "Lỗi máy chủ";
      case "validation":
        return "Lỗi dữ liệu";
      case "auth":
        return "Lỗi xác thực";
      case "cors":
        return "Lỗi CORS";
      case "unknown":
      default:
        return "Đã xảy ra lỗi";
    }
  }, [errorType]);

  // Đề xuất giải pháp mặc định
  const defaultSuggestion = React.useMemo(() => {
    switch (errorType) {
      case "network":
        return "Vui lòng kiểm tra kết nối internet của bạn và thử lại.";
      case "server":
        return "Máy chủ đang gặp sự cố. Vui lòng thử lại sau.";
      case "validation":
        return "Vui lòng kiểm tra lại thông tin đã nhập.";
      case "auth":
        return "Vui lòng kiểm tra lại thông tin đăng nhập.";
      case "cors":
        return "Lỗi cấu hình CORS giữa frontend và backend. Cần cập nhật cấu hình CORS ở backend.";
      case "unknown":
      default:
        return "Vui lòng thử lại hoặc liên hệ hỗ trợ nếu lỗi vẫn tiếp tục.";
    }
  }, [errorType]);

  // Hiển thị giải pháp chi tiết cho lỗi CORS
  const renderCorsHelp = () => {
    if (errorType !== "cors" || !showSolutions) return null;
    
    return (
      <div className="mt-3 text-xs bg-yellow-50 p-2 rounded border border-yellow-200">
        <p className="font-medium mb-1">Giải pháp cho người phát triển:</p>
        <ol className="list-decimal ml-4 space-y-1">
          <li>Mở file <code className="bg-gray-100 px-1 rounded">main.py</code> trong thư mục backend</li>
          <li>Tìm đoạn cấu hình CORS middleware</li>
          <li>Thay <code className="bg-gray-100 px-1 rounded">allow_origins=["*"]</code> bằng danh sách chính xác các origins</li>
          <li>Đảm bảo <code className="bg-gray-100 px-1 rounded">allow_credentials=True</code></li>
          <li>Khởi động lại backend server</li>
        </ol>
        <p className="mt-1 italic">Chi tiết xem trong <code className="bg-gray-100 px-1 rounded">docs/cors-fix.md</code></p>
      </div>
    );
  };

  // Màu sắc dựa vào loại lỗi
  const colors = React.useMemo(() => {
    switch (errorType) {
      case "network":
        return "bg-yellow-50 border-yellow-200 text-yellow-700";
      case "server":
        return "bg-orange-50 border-orange-200 text-orange-700";
      case "validation":
        return "bg-blue-50 border-blue-200 text-blue-700";
      case "auth":
        return "bg-red-50 border-red-200 text-red-700";
      case "cors":
        return "bg-purple-50 border-purple-200 text-purple-700";
      case "unknown":
      default:
        return "bg-gray-50 border-gray-200 text-gray-700";
    }
  }, [errorType]);

  return (
    <div className={`border rounded-md px-4 py-3 ${colors} ${className}`}>
      <div className="flex items-start">
        <Icon className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
        <div className="w-full">
          <p className="font-medium">{title || defaultTitle}</p>
          <p className="text-sm">{message}</p>
          {(suggestion || defaultSuggestion) && (
            <p className="text-sm mt-2">{suggestion || defaultSuggestion}</p>
          )}
          {renderCorsHelp()}
        </div>
      </div>
    </div>
  );
}

// Hàm trợ giúp xác định loại lỗi từ Error object
export function determineErrorType(error: any): "network" | "server" | "validation" | "auth" | "cors" | "unknown" {
  if (!error) return "unknown";
  
  // Kiểm tra lỗi CORS
  if (error.message?.includes("CORS") || error.name === "CORS Error" || 
      (error instanceof TypeError && error.message.includes("fetch") && window.location.hostname === "localhost")) {
    return "cors";
  }
  
  // Kiểm tra lỗi network
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return "network";
  }
  
  // Kiểm tra lỗi server
  if (error.status >= 500 || error.message?.includes("server")) {
    return "server";
  }
  
  // Kiểm tra lỗi xác thực
  if (error.status === 401 || error.status === 403 || 
      error.message?.includes("unauthorized") || 
      error.message?.includes("forbidden") ||
      error.message?.includes("authentication")) {
    return "auth";
  }
  
  // Kiểm tra lỗi validation
  if (error.status === 400 || error.status === 422 || 
      error.message?.includes("validation")) {
    return "validation";
  }
  
  return "unknown";
} 