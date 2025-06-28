#!/usr/bin/env python3
"""
Script để tạo dữ liệu test, đồng thời tạo bảng nếu chưa có.
"""
import psycopg2
import json
from datetime import datetime
import os
import sys

# Thêm đường dẫn project vào sys.path để import các module của app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import create_engine
from app.db.session import Base
from app.core.config import settings

# Kết nối qua SQLAlchemy để tạo bảng
engine = create_engine(settings.DATABASE_URL.replace("+asyncpg", ""))

def setup_database():
    """Tạo tất cả các bảng nếu chúng chưa tồn tại."""
    try:
        print("Đang kiểm tra và tạo bảng...")
        Base.metadata.create_all(bind=engine)
        print("✅ Tất cả các bảng đã được tạo/xác minh.")
    except Exception as e:
        print(f"Lỗi khi tạo bảng: {e}")
        raise

# Cấu hình kết nối database - Vui lòng kiểm tra lại nếu cần
DB_CONFIG = {
    'host': 'localhost',
    'database': 'eduscan',
    'user': 'lethephu',
    'password': 'lethephu',
    'port': '5432'
}

def create_test_data():
    conn = None
    try:
        # Kết nối database
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        
        print("=== Bắt đầu tạo dữ liệu test ===")

        # Tạo hoặc lấy các ID cần thiết
        cur.execute('SELECT "maToChuc" FROM "TOCHUC" WHERE "tenToChuc" = %s LIMIT 1;', ('Tổ chức Test',))
        org = cur.fetchone()
        if org:
            org_id = org[0]
            print(f"Sử dụng tổ chức có sẵn, ID: {org_id}")
        else:
            cur.execute("""
                INSERT INTO "TOCHUC" ("tenToChuc", "loaiToChuc") VALUES (%s, %s) RETURNING "maToChuc";
            """, ('Tổ chức Test', 'university'))
            org_id = cur.fetchone()[0]
            print(f"Đã tạo tổ chức mới, ID: {org_id}")

        cur.execute('INSERT INTO "NGUOIDUNG" (email, "matKhauMaHoa", "hoTen", "vaiTro", "maToChuc") VALUES (%s, %s, %s, %s, %s) ON CONFLICT DO NOTHING RETURNING "maNguoiDung";', ('teacher@test.com', '$2b$12$D.W.A.Y.L.X.Z.Y.Y.H.c.e.f.g.h', 'Giáo viên Test', 'TEACHER', org_id))
        cur.execute('SELECT "maNguoiDung" FROM "NGUOIDUNG" WHERE email = %s;', ('teacher@test.com',))
        teacher_id = cur.fetchone()[0]

        cur.execute('INSERT INTO "LOPHOC" ("maLopHoc", "tenLop", "maToChuc", "maGiaoVienChuNhiem") VALUES (%s, %s, %s, %s) ON CONFLICT ("maLopHoc") DO NOTHING;', (1, 'Lớp 1A - Test', org_id, teacher_id))
        print("Đã tạo/xác minh Lớp học ID 1.")
        class_id = 1

        cur.execute('INSERT INTO "MAUPHIEUTRALOI" ("maMauPhieu", "tenMauPhieu", "soCauHoi", "maNguoiTao") VALUES (%s, %s, %s, %s) ON CONFLICT ("maMauPhieu") DO NOTHING;', (1, 'Template Test 20 Câu', 20, teacher_id))
        print("Đã tạo/xác minh Mẫu phiếu ID 1.")
        template_id = 1

        # Tạo bài kiểm tra với trạng thái "xuatBan" cho Lớp 1
        cur.execute("""
            INSERT INTO "BAIKIEMTRA" ("maBaiKiemTra", "tieuDe", "monHoc", "tongSoCau", "trangThai", "maMauPhieu", "maNguoiTao", "maToChuc")
            VALUES (%s, %s, 'Toán', 20, 'xuatBan', %s, %s, %s)
            ON CONFLICT ("maBaiKiemTra") DO UPDATE SET "trangThai" = 'xuatBan';
        """, (1, 'Bài Test OMR Đã Xuất Bản', template_id, teacher_id, org_id))
        print("Đã tạo/cập nhật Bài kiểm tra ID 1 với trangThai='xuatBan'.")
        exam_id = 1

        # Gán bài kiểm tra cho lớp
        cur.execute("""
            INSERT INTO "BAIKIEMTRA_LOPHOC" ("maLopHoc", "maBaiKiemTra") VALUES (%s, %s)
            ON CONFLICT ("maLopHoc", "maBaiKiemTra") DO NOTHING;
        """, (class_id, exam_id))
        print(f"Đã gán bài kiểm tra ID {exam_id} cho lớp ID {class_id}.")
        
        # Tạo đáp án
        dap_an_json = {"123": {f"q{i+1}": "A" for i in range(20)}}
        diem_moi_cau_json = {f"q{i+1}": 0.5 for i in range(20)}
        cur.execute("""
            INSERT INTO "DAPAN" ("maBaiKiemTra", "dapAnJson", "diemMoiCauJson") VALUES (%s, %s, %s)
            ON CONFLICT ("maBaiKiemTra") DO NOTHING;
        """, (exam_id, json.dumps(dap_an_json), json.dumps(diem_moi_cau_json)))
        print(f"Đã tạo/cập nhật đáp án cho bài kiểm tra ID {exam_id}.")
        
        conn.commit()
        print("\\n=== TẠO DỮ LIỆU TEST THÀNH CÔNG! ===")
        
    except Exception as e:
        print(f"Lỗi: {e}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    try:
        setup_database()
        create_test_data()
    except Exception as e:
        print(f"Đã có lỗi xảy ra trong quá trình thiết lập: {e}") 