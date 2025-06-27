"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, Eye, FileText, Hash } from "lucide-react"
import { answerTemplatesApi } from "@/lib/api/answer-templates"
import type { AnswerSheetTemplate } from "@/lib/api/answer-templates"
import Image from "next/image"

// API function
const fetchTemplates = async (filters: any) => {
  return answerTemplatesApi.searchTemplates(filters)
}

const TemplateCardSkeleton = () => (
  <Card className="overflow-hidden">
    <Skeleton className="h-48 w-full" />
    <CardHeader>
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </CardHeader>
    <CardFooter>
      <Skeleton className="h-10 w-full" />
    </CardFooter>
  </Card>
)

const TemplateCard = ({ template }: { template: AnswerSheetTemplate }) => {
  const imageUrl = template.urlFilePreview || template.urlFileMau || "/placeholder.png"

        return (
    <Card className="group overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
      <CardContent className="p-0">
        <div className="relative h-48 w-full">
          <Image
            src={imageUrl}
            alt={template.tenMauPhieu}
            layout="fill"
            objectFit="cover"
            className="transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
        </div>
      </CardContent>
      <CardHeader>
        <CardTitle className="truncate">{template.tenMauPhieu}</CardTitle>
        <div className="flex items-center gap-4 text-sm text-muted-foreground pt-1">
            <div className="flex items-center gap-1"><Hash className="h-4 w-4" />{template.soCauHoi} câu</div>
            <div className="flex items-center gap-1"><FileText className="h-4 w-4" />{template.khoGiay}</div>
        </div>
      </CardHeader>
      <CardFooter className="flex justify-between">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/dashboard/teacher/answer-templates/${template.maMauPhieu}`}><Eye className="mr-2 h-4 w-4"/>Xem</Link>
        </Button>
        <Button size="sm" asChild>
          <Link href={`/dashboard/teacher/exams/create?templateId=${template.maMauPhieu}`}>Sử dụng mẫu</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}

export default function AnswerTemplatesLibraryPage() {
  const [filters, setFilters] = useState({ search: "" })

  const { data: templates, isLoading, error } = useQuery({
    queryKey: ['answerTemplates', filters],
    queryFn: () => fetchTemplates(filters),
    staleTime: 5 * 60 * 1000,
  })

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
        <div>
            <h1 className="text-3xl font-bold">Thư viện Mẫu phiếu trả lời</h1>
            <p className="text-muted-foreground">Khám phá và sử dụng các mẫu có sẵn cho bài kiểm tra của bạn.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/admin/answer-templates/create"><Plus className="mr-2 h-4 w-4"/> Tạo mẫu mới</Link>
        </Button>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
              <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
              placeholder="Tìm kiếm mẫu phiếu..."
              className="pl-10"
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => <TemplateCardSkeleton key={i} />)}
                          </div>
      )}

      {error && (
          <div className="text-center py-10">
              <p className="text-red-500">Không thể tải danh sách mẫu phiếu. Vui lòng thử lại.</p>
                      </div>
                    )}

      {!isLoading && !error && (
        templates && templates.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {templates.map((template) => <TemplateCard key={template.maMauPhieu} template={template} />)}
                  </div>
        ) : (
          <div className="text-center py-10 bg-gray-50/50 rounded-lg">
            <h3 className="text-xl font-semibold">Không tìm thấy mẫu nào</h3>
            <p className="text-muted-foreground mt-2">Không có mẫu phiếu nào khớp với tìm kiếm của bạn.</p>
          </div>
        )
      )}
    </div>
  )
}
