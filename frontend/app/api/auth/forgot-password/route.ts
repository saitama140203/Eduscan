import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://eduscan.local/api/v1";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { message: 'Email là bắt buộc' },
        { status: 400 }
      );
    }

    // Gửi yêu cầu đến endpoint public (không cần auth)
    const response = await fetch(`${API_BASE_URL}/password-reset-requests/public`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_email: email,
        reason: 'Yêu cầu đặt lại mật khẩu từ trang quên mật khẩu'
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      if (response.status === 404) {
        return NextResponse.json(
          { message: 'Không tìm thấy tài khoản với email này' },
          { status: 404 }
        );
      }
      
      if (response.status === 403) {
        return NextResponse.json(
          { message: 'Chỉ tài khoản giáo viên và quản lý mới có thể yêu cầu reset password' },
          { status: 403 }
        );
      }
      
      if (response.status === 400) {
        return NextResponse.json(
          { message: errorData.detail || 'Dữ liệu không hợp lệ' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { message: 'Có lỗi xảy ra khi xử lý yêu cầu' },
        { status: 500 }
      );
    }

    const result = await response.json();
    
    return NextResponse.json({
      message: 'Yêu cầu đặt lại mật khẩu đã được gửi thành công',
      request_id: result.id
    });

  } catch (error) {
    console.error('Forgot password API error:', error);
    
    // Kiểm tra lỗi network
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return NextResponse.json(
        { message: 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.' },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { message: 'Lỗi máy chủ nội bộ' },
      { status: 500 }
    );
  }
} 