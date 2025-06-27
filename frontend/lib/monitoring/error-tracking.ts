// lib/monitoring/error-tracking.ts - phiên bản đơn giản

// Loại bỏ phụ thuộc vào analytics/gtag
// import { safeGtag } from "./analytics";

interface ErrorReport {
  message: string
  stack?: string
  url: string
  userAgent: string
  timestamp: number
  userId?: string
  sessionId: string
  context?: Record<string, any>
}

class ErrorTracker {
  private sessionId: string
  private userId?: string

  constructor() {
    this.sessionId = this.generateSessionId()
    // Tạm thời tắt global error handlers để debug
    // this.setupGlobalErrorHandlers()
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  setUserId(userId: string) {
    this.userId = userId
  }

  private setupGlobalErrorHandlers() {
    if (typeof window === "undefined") return;
  
    // Lắng nghe promise bị reject toàn cục
    window.addEventListener("unhandledrejection", (event) => {
      // LOG lý do bị reject (giá trị gốc promise trả về)
      console.error("==== [DEBUG] Promise Rejection reason:", event.reason);
  
      let error: Error;
      if (event.reason instanceof Error) {
        error = event.reason;
      } else if (typeof event.reason === "string") {
        error = new Error(event.reason);
      } else {
        try {
          error = new Error(JSON.stringify(event.reason));
        } catch {
          error = new Error("Unknown unhandledrejection reason");
        }
      }
      this.reportError(error, "unhandled_promise_rejection");
    });
  
    // Lắng nghe lỗi toàn cục trên window
    window.addEventListener("error", (event) => {
      this.reportError(event.error || new Error(event.message), "global_error", {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    });
  }
  

  reportError(error: Error, context?: string, additionalData?: Record<string, any>) {
    // DEBUG: log lỗi gốc trước khi xử lý (giúp trace về đúng nguồn)
    console.error("Global error tracked:", error);

    const errorReport: ErrorReport = {
      message: error.message,
      stack: error.stack,
      url: typeof window !== "undefined" ? window.location.href : "",
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      timestamp: Date.now(),
      userId: this.userId,
      sessionId: this.sessionId,
      context: {
        context,
        ...additionalData,
      },
    };

    // Gửi tới backend của bạn - chỉ trong development
    if (process.env.NODE_ENV === 'development') {
      this.sendErrorReport(errorReport);
    }

    // Tạm thời tắt tracking GA
    // safeGtag.exception(error.message, false);
  }

  private async sendErrorReport(errorReport: ErrorReport) {
    try {
      await fetch("/api/errors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(errorReport),
      });
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to send error report:", err);
        console.error("Original error:", errorReport);
      }
    }
  }
}

export const errorTracker = new ErrorTracker();
