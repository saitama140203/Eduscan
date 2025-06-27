import pytest
import asyncio
from fastapi import FastAPI
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime

from app.core.config import settings
from app.db.session import Base
from app.models.user import User
from app.core.security import get_password_hash
from app.routes import auth

# Tạo database cho testing
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

# Tạo engine và session async cho testing
test_engine = create_async_engine(
    TEST_DATABASE_URL,
    echo=False,
    future=True
)

TestSessionLocal = sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# Dependency cho testing để override dependency trong app
async def get_test_db():
    async with TestSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

# Tạo app và override dependency
app = FastAPI()
app.include_router(auth.router)

# Override dependency để sử dụng test database
import app.routes.auth as auth_module
auth_module.get_db = get_test_db

# Fixture để tạo và xóa database testing
@pytest.fixture(scope="function")
async def setup_database():
    # Tạo tables
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Tạo dữ liệu test
    async with TestSessionLocal() as session:
        # Tạo user test
        hashed_password = get_password_hash("password123")
        test_user = User(
            email="test@example.com",
            matKhau=hashed_password,
            hoTen="Test User",
            vaiTro="Teacher",
            soDienThoai="0123456789",
            trangThai=True,
            thoiGianTao=datetime.utcnow(),
            thoiGianCapNhat=datetime.utcnow()
        )
        
        session.add(test_user)
        await session.commit()
    
    # Trả về để sử dụng trong test
    yield
    
    # Xóa tables sau khi test xong
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

# Fixture để tạo client test
@pytest.fixture(scope="function")
async def client():
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client

# Test đăng ký
@pytest.mark.asyncio
async def test_register(setup_database, client):
    # Dữ liệu đăng ký
    user_data = {
        "email": "newuser@example.com",
        "password": "newpassword123",
        "passwordConfirm": "newpassword123",
        "hoTen": "New User",
        "vaiTro": "Teacher",
        "soDienThoai": "0987654321"
    }
    
    # Gửi request đăng ký
    response = await client.post("/auth/register", json=user_data)
    
    # Kiểm tra kết quả
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "newuser@example.com"
    assert data["hoTen"] == "New User"
    assert "matKhau" not in data  # Đảm bảo không trả về mật khẩu

# Test đăng nhập
@pytest.mark.asyncio
async def test_login(setup_database, client):
    # Dữ liệu đăng nhập
    login_data = {
        "username": "test@example.com",  # OAuth2 sử dụng username field
        "password": "password123"
    }
    
    # Gửi request đăng nhập
    response = await client.post("/auth/login", data=login_data)
    
    # Kiểm tra kết quả
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"

# Test đăng nhập thất bại
@pytest.mark.asyncio
async def test_login_fail(setup_database, client):
    # Dữ liệu đăng nhập sai
    login_data = {
        "username": "test@example.com",
        "password": "wrongpassword"
    }
    
    # Gửi request đăng nhập
    response = await client.post("/auth/login", data=login_data)
    
    # Kiểm tra kết quả
    assert response.status_code == 401

# Test lấy thông tin người dùng hiện tại
@pytest.mark.asyncio
async def test_get_current_user(setup_database, client):
    # Đăng nhập trước để lấy token
    login_data = {
        "username": "test@example.com",
        "password": "password123"
    }
    login_response = await client.post("/auth/login", data=login_data)
    token = login_response.json()["access_token"]
    
    # Gửi request lấy thông tin người dùng
    response = await client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    # Kiểm tra kết quả
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test@example.com"
    assert data["hoTen"] == "Test User"
    assert data["vaiTro"] == "Teacher"

# Test đổi mật khẩu
@pytest.mark.asyncio
async def test_change_password(setup_database, client):
    # Đăng nhập trước để lấy token
    login_data = {
        "username": "test@example.com",
        "password": "password123"
    }
    login_response = await client.post("/auth/login", data=login_data)
    token = login_response.json()["access_token"]
    
    # Dữ liệu đổi mật khẩu
    password_data = {
        "current_password": "password123",
        "new_password": "newpassword123",
        "confirm_password": "newpassword123"
    }
    
    # Gửi request đổi mật khẩu
    response = await client.post(
        "/auth/change-password",
        json=password_data,
        headers={"Authorization": f"Bearer {token}"}
    )
    
    # Kiểm tra kết quả
    assert response.status_code == 200
    
    # Kiểm tra đăng nhập với mật khẩu mới
    new_login_data = {
        "username": "test@example.com",
        "password": "newpassword123"
    }
    new_login_response = await client.post("/auth/login", data=new_login_data)
    assert new_login_response.status_code == 200 