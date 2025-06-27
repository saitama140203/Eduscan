// lib/constants.ts
export const ORG_TYPES = [
    { value: "TRUONG_THPT", label: "Trường THPT" },
    { value: "TRUONG_THCS", label: "Trường THCS" },
    { value: "TIEU_HOC", label: "Tiểu học" },
    { value: "TRUONG_DAI_HOC", label: "Trường Đại học" },
  ] as const
  
  export type OrgType = (typeof ORG_TYPES)[number]["value"]


  
export const rolesMap = { MANAGER: "MANAGER", TEACHER: "TEACHER" }
export const statusMap = { true: "Active", false: "Inactive" }
