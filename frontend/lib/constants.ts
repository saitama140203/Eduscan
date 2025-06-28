// lib/constants.ts
export const ORG_TYPES = [
    { value: "TRUONG_THPT", label: "Trường THPT", color: "#B8E986" },
    { value: "TRUONG_THCS", label: "Trường THCS", color: "#F8E71C" },
    { value: "TIEU_HOC", label: "Tiểu học", color: "#F5A623" },
    { value: "TRUONG_DAI_HOC", label: "Trường Đại học", color: "#4A90E2" },
    { value: "TRUONG_CAO_DANG", label: "Trường Cao đẳng", color: "#50E3C2" },
    { value: "SO_GD", label: "Sở Giáo dục & Đào tạo", color: "#BD10E0" },
    { value: "PHONG_GD", label: "Phòng Giáo dục & Đào tạo", color: "#9013FE" },
    { value: "DOANH_NGHIEP", label: "Doanh nghiệp", color: "#7ED321" },
    { value: "KHAC", label: "Khác", color: "#9B9B9B" },
  ] as const
  
  export type OrgType = (typeof ORG_TYPES)[number]["value"]


  
export const rolesMap = { MANAGER: "MANAGER", TEACHER: "TEACHER" }
export const statusMap = { true: "Active", false: "Inactive" }
