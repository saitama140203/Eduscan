import { useState } from "react";
import { useCreateUser } from "@/hooks/useCreateUser";

interface UserFormProps {
  onSuccess?: () => void;
  organizations?: { maToChuc: number; tenToChuc: string }[];
}

export default function UserForm({ 
  onSuccess, 
  organizations = []
}: UserFormProps) {
  const [form, setForm] = useState({ 
    email: "", 
    hoTen: "", 
    vaiTro: "Teacher", 
    password: "",
    maToChuc: 0 // Mặc định là 0 (none)
  });
  
  const createUser = useCreateUser();

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        // Kiểm tra xem đã chọn tổ chức chưa
        if (!form.maToChuc) {
          alert("Vui lòng chọn tổ chức");
          return;
        }
        createUser.mutate(form, { onSuccess });
      }}
    >
      <input 
        value={form.email} 
        onChange={e => setForm(f => ({ ...f, email: e.target.value }))} 
        placeholder="Email" 
        type="email"
        required
      />
      
      <input 
        value={form.hoTen} 
        onChange={e => setForm(f => ({ ...f, hoTen: e.target.value }))} 
        placeholder="Họ tên" 
        required
      />
      
      <select 
        value={form.vaiTro} 
        onChange={e => setForm(f => ({ ...f, vaiTro: e.target.value }))}
      >
        <option value="Teacher">Teacher</option>
        <option value="Manager">Manager</option>
        <option value="Student">Student</option>
      </select>

      {/* Thêm field chọn tổ chức */}
      <select 
        value={form.maToChuc || ""} 
        onChange={e => setForm(f => ({ ...f, maToChuc: e.target.value ? Number(e.target.value) : 0 }))}
        required
      >
        <option value="">Chọn tổ chức</option>
        {organizations.map((org) => (
          <option key={org.maToChuc} value={org.maToChuc}>
            {org.tenToChuc}
          </option>
        ))}
      </select>
      
      <input 
        type="password" 
        value={form.password} 
        onChange={e => setForm(f => ({ ...f, password: e.target.value }))} 
        placeholder="Mật khẩu" 
        required
        minLength={6}
      />
      
      <button type="submit" disabled={createUser.isPending}>
        {createUser.isPending ? "Đang tạo..." : "Tạo mới"}
      </button>
    </form>
  );
}