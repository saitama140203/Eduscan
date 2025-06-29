// lib/constants.ts
export const ORG_TYPES = [
    { value: "TRUONG_THPT", label: "Trường THPT", color: "#B8E986" },
    { value: "TRUONG_THCS", label: "Trường THCS", color: "#F8E71C" },
    { value: "TIEU_HOC", label: "Tiểu học", color: "#F5A623" },
    { value: "TRUONG_DAI_HOC", label: "Trường Đại học", color: "#4A90E2" }
  ] as const
  
  export type OrgType = (typeof ORG_TYPES)[number]["value"]


  
export const rolesMap = { 
  MANAGER: "Quản lý", 
  TEACHER: "Giáo viên" 
}
export const statusMap = { true: "Active", false: "Inactive" }
 