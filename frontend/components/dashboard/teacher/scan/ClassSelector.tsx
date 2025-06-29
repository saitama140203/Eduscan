"use client"

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Grid, List, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import type { Class } from "@/lib/api/classes";
import { Skeleton } from '@/components/ui/skeleton';

export const ClassSelector = ({ classes, selectedClass, onSelect, isLoading }: { 
  classes: Class[] | undefined; 
  selectedClass: Class | null; 
  onSelect: (classItem: Class) => void; 
  isLoading: boolean 
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  if (isLoading) {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-64 mt-2" />
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
            </CardContent>
        </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <CardTitle>1. Chọn lớp học</CardTitle>
              <p className="text-sm text-muted-foreground">Lựa chọn lớp để bắt đầu chấm điểm</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant={viewMode === 'grid' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('grid')}>
              <Grid className="w-4 h-4" />
            </Button>
            <Button variant={viewMode === 'list' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('list')}>
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className={clsx(
          "gap-4",
          viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "space-y-3"
        )}>
          {classes?.map((classItem) => (
            <div key={classItem.maLopHoc} className={clsx(
              "p-4 rounded-lg border transition-all duration-200 cursor-pointer group",
              "hover:shadow-md hover:border-blue-300",
              selectedClass?.maLopHoc === classItem.maLopHoc 
                ? "border-blue-500 bg-blue-50 shadow-md" 
                : "border-gray-200 hover:bg-gray-50"
            )} onClick={() => onSelect(classItem)}>
              <div className={clsx(
                "flex items-center",
                viewMode === 'grid' ? "flex-col text-center space-y-3" : "space-x-4"
              )}>
                <div className={clsx(
                  "rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200",
                  viewMode === 'grid' ? "w-12 h-12" : "w-10 h-10",
                  selectedClass?.maLopHoc === classItem.maLopHoc 
                    ? "bg-blue-600 text-white" 
                    : "bg-gray-100 text-gray-600 group-hover:bg-blue-100 group-hover:text-blue-600"
                )}>
                  <Users className={clsx(viewMode === 'grid' ? "w-6 h-6" : "w-5 h-5")} />
                </div>
                <div className="flex-1">
                  <h3 className={clsx(
                    "font-semibold transition-colors",
                    viewMode === 'grid' ? "text-base" : "text-sm",
                    selectedClass?.maLopHoc === classItem.maLopHoc 
                      ? "text-blue-900" 
                      : "text-gray-900 group-hover:text-blue-700"
                  )}>
                    {classItem.tenLop}
                  </h3>
                  <p className={clsx(
                    "text-muted-foreground",
                    viewMode === 'grid' ? "text-sm" : "text-xs"
                  )}>
                    {classItem.capHoc} • {classItem.total_students || 0} học sinh
                  </p>
                  {viewMode === 'grid' && (
                    <div className="flex justify-center mt-2">
                      <Badge variant="outline" className={clsx(
                        selectedClass?.maLopHoc === classItem.maLopHoc 
                          ? "border-blue-500 text-blue-700" 
                          : "border-gray-300"
                      )}>
                        {classItem.total_exams || 0} bài thi
                      </Badge>
                    </div>
                  )}
                </div>
                {viewMode === 'list' && (
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className={clsx(
                      selectedClass?.maLopHoc === classItem.maLopHoc 
                        ? "border-blue-500 text-blue-700" 
                        : "border-gray-300"
                    )}>
                      {classItem.total_exams || 0} bài thi
                    </Badge>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-blue-600 transition-colors" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
} 