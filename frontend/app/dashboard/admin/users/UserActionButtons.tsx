"use client"

import { Pencil, UserX, UserCheck } from "lucide-react"

export function UserActionButtons({ user, onEdit, onToggleActive }) {
  return (
    <div className="flex space-x-2">
      <button
        type="button"
        className="flex items-center gap-1 px-2 py-1 rounded border hover:bg-gray-50"
        onClick={() => onEdit(user)}
      >
        <Pencil size={14} />
        <span>Sửa</span>
      </button>
      {user.trangThai ? (
        <button
          type="button"
          className="flex items-center gap-1 px-2 py-1 rounded border border-orange-200 text-orange-600 hover:bg-orange-50"
          onClick={() => onToggleActive(user, false)}
        >
          <UserX size={14} />
          <span>Vô hiệu hoá</span>
        </button>
      ) : (
        <button
          type="button"
          className="flex items-center gap-1 px-2 py-1 rounded border border-green-200 text-green-600 hover:bg-green-50"
          onClick={() => onToggleActive(user, true)}
        >
          <UserCheck size={14} />
          <span>Kích hoạt lại</span>
        </button>
      )}
    </div>
  )
}
