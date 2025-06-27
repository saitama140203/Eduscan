import { ReactNode } from "react";
import Link from "next/link";
import { Scan, Users, BookOpen, BarChart3, CheckCircle } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  const features = [
    {
      icon: <Scan className="h-6 w-6" />,
      title: "Chấm bài trắc nghiệm",
      description: "Tự động nhận diện và chấm điểm chính xác từ ảnh bài làm."
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: "Quản lý học sinh & giáo viên",
      description: "Theo dõi kết quả, lịch sử làm bài và phân công giáo viên."
    },
    {
      icon: <BookOpen className="h-6 w-6" />,
      title: "Quản lý lớp học & đề thi",
      description: "Tổ chức lớp, tạo và quản lý đề thi hiệu quả."
    },
    {
      icon: <BarChart3 className="h-6 w-6" />,
      title: "Thống kê & Báo cáo",
      description: "Phân tích kết quả, xuất báo cáo chi tiết minh bạch."
    }
  ];
  const patternUrl = "data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E";
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      {/* Left Panel - Auth Form */}
      <div className="flex flex-1 flex-col justify-center py-12 px-4 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          {/* Logo */}
          <div className="mb-8">
            <Link href="/" className="flex items-center group">
              <div className="flex items-center justify-center w-10 h-10 bg-indigo-600 rounded-xl mr-3 group-hover:bg-indigo-700 transition-colors">
                <Scan className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
                EduScan
              </span>
            </Link>
            <p className="text-sm text-gray-600 mt-2 ml-12">
              Hệ thống chấm thi trắc nghiệm thông minh, chính xác & nhanh chóng
            </p>
          </div>
          
          {/* Auth Form */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            {children}
          </div>
          
          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              © 2024 EduScan. Tất cả quyền được bảo lưu.
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Marketing Content */}
      <div className="relative hidden w-0 flex-1 lg:block">
        <div className="absolute inset-0 h-full w-full bg-gradient-to-br from-indigo-600 via-indigo-700 to-blue-800">
          {/* Decorative Pattern */}
          <div className="absolute inset-0" style={{ backgroundImage: `url('${patternUrl}')` }}></div>
          <div className="relative flex h-full items-center justify-center p-12">
            <div className="max-w-2xl text-white">
              {/* Main Heading */}
              <div className="mb-8">
                <div className="flex items-center mb-4">
                  <Scan className="h-8 w-8 text-indigo-200 mr-3" />
                  <span className="text-indigo-200 font-semibold">Nền tảng chấm thi tự động</span>
                </div>
                <h2 className="text-5xl font-bold mb-6 leading-tight">
                  Chấm trắc nghiệm <span className="block text-indigo-200">bằng AI & Computer Vision</span>
                </h2>
                <p className="text-xl text-indigo-100 leading-relaxed">
                  Tiết kiệm 90% thời gian, tăng độ chính xác lên 99%. Kết quả realtime, quản lý toàn diện bài thi, lớp học, giáo viên, học sinh.
                </p>
              </div>

              {/* Features Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {features.map((feature, index) => (
                  <div 
                    key={index}
                    className="flex items-start space-x-4 p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/15 transition-all duration-300"
                  >
                    <div className="flex-shrink-0">
                      <div className="flex items-center justify-center w-12 h-12 bg-white/20 rounded-lg">
                        {feature.icon}
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white mb-1">{feature.title}</h3>
                      <p className="text-sm text-indigo-100">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Benefits */}
              <div className="space-y-3">
                {[
                  "Chấm điểm realtime từ ảnh bài làm",
                  "Tiết kiệm công sức cho giáo viên, học sinh",
                  "Báo cáo & thống kê minh bạch, chi tiết",
                  "An toàn, bảo mật, hỗ trợ mọi thiết bị"
                ].map((benefit, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                    <span className="text-indigo-100">{benefit}</span>
                  </div>
                ))}
              </div>

              {/* Call to Action */}
              <div className="mt-8 p-6 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                <h3 className="font-semibold text-white mb-2">Sẵn sàng trải nghiệm EduScan?</h3>
                <p className="text-indigo-100 text-sm">
                  Đăng nhập và bắt đầu chấm thi tự động, quản lý hiệu quả cùng EduScan ngay hôm nay!
                </p>
              </div>
            </div>
          </div>
          
          {/* Decorative Elements */}
          <div className="absolute top-10 right-10 w-20 h-20 bg-white/10 rounded-full blur-xl"></div>
          <div className="absolute bottom-20 left-10 w-32 h-32 bg-indigo-400/20 rounded-full blur-2xl"></div>
          <div className="absolute top-1/2 right-1/4 w-16 h-16 bg-indigo-400/20 rounded-full blur-xl"></div>
        </div>
      </div>
    </div>
  );
}
