"""
Script để điền dữ liệu mẫu (seed data) vào cơ sở dữ liệu.
Chạy script này SAU KHI đã chạy `alembic upgrade head` để tạo schema.
Ví dụ cách chạy từ thư mục `AI/backend/`:
PYTHONPATH=. python app/db/seed.py
"""
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text # Thêm import này
from passlib.context import CryptContext # Để hash mật khẩu

from app.db.session import AsyncSessionLocal, engine, Base # engine và Base có thể cần cho khởi tạo ban đầu nếu chạy độc lập hoàn toàn
from app.models.user import User
from app.models.organization import Organization
from app.models.class_room import ClassRoom
from app.models.student import Student
from app.models.exam import Exam # Thêm các model khác nếu cần
from app.models.answer_sheet_template import AnswerSheetTemplate
# Import các model khác bạn muốn seed dữ liệu vào
# from app.models.file import File
# from app.models.setting import Setting

# Cấu hình để hash mật khẩu (giống như trong app/core/security.py hoặc tương tự)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str):
    return pwd_context.hash(password)

async def seed_data():
    async with AsyncSessionLocal() as db:
        try:
            print("Bắt đầu seeding dữ liệu...")

            # === TỔ CHỨC ===
            print("Tạo tổ chức...")
            result = await db.execute(
                text("SELECT * FROM \"TOCHUC\" WHERE \"tenToChuc\" = 'EduScan Corp'")
            )
            org1_row = result.fetchone()
            
            if not org1_row:
                org1 = Organization(
                    tenToChuc="EduScan Corp",
                    loaiToChuc="Education Technology",
                    diaChi="123 Main St, Anytown",
                    urlLogo="https://example.com/logo_eduscan.png"
                )
                db.add(org1)
                await db.commit()
                await db.refresh(org1)
                print(f"Đã tạo tổ chức: {org1.tenToChuc}")
            else:
                org1 = await db.get(Organization, org1_row.maToChuc)
                print(f"Tổ chức '{org1.tenToChuc}' đã tồn tại.")

            result = await db.execute(
                text("SELECT * FROM \"TOCHUC\" WHERE \"tenToChuc\" = 'Trường THPT ABC'")
            )
            org2_row = result.fetchone()
            
            if not org2_row:
                org2 = Organization(
                    tenToChuc="Trường THPT ABC",
                    loaiToChuc="Trường học",
                    diaChi="456 School Rd, Anytown",
                    urlLogo="https://example.com/logo_abc.png"
                )
                db.add(org2)
                await db.commit()
                await db.refresh(org2)
                print(f"Đã tạo tổ chức: {org2.tenToChuc}")
            else:
                org2 = await db.get(Organization, org2_row.maToChuc)
                print(f"Tổ chức '{org2.tenToChuc}' đã tồn tại.")

            # === NGƯỜI DÙNG ===
            print("\nTạo người dùng...")
            result = await db.execute(
                text("SELECT * FROM \"NGUOIDUNG\" WHERE \"email\" = 'admin@eduscan.com'")
            )
            admin_user_row = result.fetchone()
            
            if not admin_user_row:
                admin_user = User(
                    email="admin@eduscan.com",
                    matKhauMaHoa=get_password_hash("admin123"),
                    hoTen="Admin EduScan",
                    vaiTro="Admin", 
                    maToChuc=org1.maToChuc, 
                    trangThai=True
                )
                db.add(admin_user)
                await db.commit()
                await db.refresh(admin_user)
                print(f"Đã tạo người dùng: {admin_user.email}")
            else:
                admin_user = await db.get(User, admin_user_row.maNguoiDung)
                print(f"Người dùng '{admin_user.email}' đã tồn tại.")
            
            result = await db.execute(
                text("SELECT * FROM \"NGUOIDUNG\" WHERE \"email\" = 'teacher@abc.edu.vn'")
            )
            teacher_user_row = result.fetchone()
            
            if not teacher_user_row:
                teacher_user = User(
                    email="teacher@abc.edu.vn",
                    matKhauMaHoa=get_password_hash("teacher123"),
                    hoTen="Cô Giáo Thảo",
                    vaiTro="Teacher", 
                    maToChuc=org2.maToChuc, 
                    trangThai=True
                )
                db.add(teacher_user)
                await db.commit()
                await db.refresh(teacher_user)
                print(f"Đã tạo người dùng: {teacher_user.email}")
            else:
                teacher_user = await db.get(User, teacher_user_row.maNguoiDung)
                print(f"Người dùng '{teacher_user.email}' đã tồn tại.")

            # === LỚP HỌC ===
            print("\nTạo lớp học...")
            result = await db.execute(
                text("SELECT * FROM \"LOPHOC\" WHERE \"tenLop\" = '10A1' AND \"maToChuc\" = :maToChuc"),
                {"maToChuc": org2.maToChuc}
            )
            class_10a1_row = result.fetchone()
            
            if not class_10a1_row:
                class_10a1 = ClassRoom(
                    tenLop="10A1",
                    maToChuc=org2.maToChuc,
                    capHoc="THPT",
                    namHoc="2023-2024",
                    maGiaoVienChuNhiem=teacher_user.maNguoiDung
                )
                db.add(class_10a1)
                await db.commit()
                await db.refresh(class_10a1)
                print(f"Đã tạo lớp: {class_10a1.tenLop} - {org2.tenToChuc}")
            else:
                class_10a1 = await db.get(ClassRoom, class_10a1_row.maLopHoc)
                print(f"Lớp '{class_10a1.tenLop}' của '{org2.tenToChuc}' đã tồn tại.")

            # === HỌC SINH ===
            print("\nTạo học sinh...")
            result = await db.execute(
                text("SELECT * FROM \"HOCSINH\" WHERE \"maHocSinhTruong\" = 'HS001' AND \"maLopHoc\" = :maLopHoc"),
                {"maLopHoc": class_10a1.maLopHoc}
            )
            student1_row = result.fetchone()
            
            if not student1_row:
                student1 = Student(
                    maLopHoc=class_10a1.maLopHoc,
                    maHocSinhTruong="HS001",
                    hoTen="Nguyễn Văn An",
                    ngaySinh="2007-05-10",
                    gioiTinh="Nam"
                )
                db.add(student1)
                await db.commit()
                await db.refresh(student1) # refresh student1 sau khi commit
                print(f"Đã tạo học sinh: {student1.hoTen} - Lớp {class_10a1.tenLop}")
            else:
                # Gán student1 từ student1_row để đảm bảo nó có giá trị
                student1 = await db.get(Student, student1_row.maHocSinh) 
                print(f"Học sinh có mã '{student1.maHocSinhTruong}' lớp '{class_10a1.tenLop}' đã tồn tại.")

            print("\nHoàn tất seeding dữ liệu!")

        except Exception as e:
            print(f"Lỗi trong quá trình seeding: {e}")
            await db.rollback()
            raise e

async def main():
    await seed_data()

if __name__ == "__main__":
    asyncio.run(main()) 