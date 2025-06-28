import { useUsers, useUsersByOrganization } from "@/hooks/useUsers";
import { useDeleteUser } from "@/hooks/useDeleteUser";

export default function UserTable({ orgId }: { orgId?: number }) {
  const queryResult = orgId 
    ? useUsersByOrganization(orgId) 
    : useUsers();
  
  const { data: users, isLoading } = queryResult;
  const delUser = useDeleteUser();

  if (isLoading) return <div>Loading...</div>;
  return (
    <table>
      <thead>
        <tr>
          <th>Email</th>
          <th>Họ tên</th>
          <th>Vai trò</th>
          <th>Thao tác</th>
        </tr>
      </thead>
      <tbody>
        {users?.data?.map(u => (
          <tr key={u.maNguoiDung}>
            <td>{u.email}</td>
            <td>{u.hoTen}</td>
            <td>{u.vaiTro}</td>
            <td>
              <button onClick={() => {/* Điều hướng sang edit */}}>Sửa</button>
              <button onClick={() => delUser.mutate(u.maNguoiDung.toString())}>Xoá</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
