import { formatDistanceToNow } from "date-fns"
import { vi } from "date-fns/locale"

export function timeAgo(date?: string | Date) {
  if (!date) return "-"
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: vi })
  } catch {
    return "-"
  }
}
