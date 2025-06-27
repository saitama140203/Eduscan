import { useState } from "react";
import { useCreateUser } from "@/hooks/useCreateUser";

export default function UserForm({ onSuccess }: { onSuccess?: () => void }) {
  const [form, setForm] = useState({ email: "", hoTen: "", vaiTro: "Teacher", password: "" });
  const createUser = useCreateUser();

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        createUser.mutate(form, { onSuccess });
      }}
    >
      <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="Email" />
      <input value={form.hoTen} onChange={e => setForm(f => ({ ...f, hoTen: e.target.value }))} placeholder="Họ tên" />
      <select value={form.vaiTro} onChange={e => setForm(f => ({ ...f, vaiTro: e.target.value }))}>
        <option value="Teacher">Teacher</option>
        <option value="Manager">Manager</option>
        <option value="Admin">Admin</option>
      </select>
      <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Mật khẩu" />
      <button type="submit" disabled={createUser.isPending}>Tạo mới</button>
    </form>
  );
}
