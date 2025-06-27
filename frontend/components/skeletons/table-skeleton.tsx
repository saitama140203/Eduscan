import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export function TableSkeleton() {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Skeleton className="h-6 w-24" />
            </TableHead>
            <TableHead>
              <Skeleton className="h-6 w-32" />
            </TableHead>
            <TableHead>
              <Skeleton className="h-6 w-20" />
            </TableHead>
            <TableHead>
              <Skeleton className="h-6 w-40" />
            </TableHead>
            <TableHead>
              <Skeleton className="h-6 w-24" />
            </TableHead>
            <TableHead className="text-right">
              <Skeleton className="h-6 w-16 ml-auto" />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell>
                <Skeleton className="h-6 w-32" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-6 w-40" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-6 w-20" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-6 w-48" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-6 w-24" />
              </TableCell>
              <TableCell className="text-right">
                <Skeleton className="h-8 w-8 ml-auto" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
