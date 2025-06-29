"use client"

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Save, X, Loader2, Download, List, Grid, BarChart3, CheckCircle, AlertCircle, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import type { ScanResult } from '@/types/scan';
import type { Exam } from '@/lib/api/exams';

export const ResultsDisplay = ({ 
  results, 
  onSaveAll, 
  onClearResults,
  onNewBatch,
  isSaving 
}: { 
  results: ScanResult[], 
  onSaveAll: () => Promise<void>,
  onClearResults: () => void,
  onNewBatch: () => void,
  isSaving: boolean 
}) => {
  if (results.length === 0) return null;
  
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
            <CardTitle>Kết quả chấm ({results.length})</CardTitle>
            <div className="flex gap-2">
                <Button onClick={onSaveAll} disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Lưu tất cả
                </Button>
                <Button variant="outline" onClick={onNewBatch}>Batch mới</Button>
                <Button variant="destructive" onClick={onClearResults}>Xóa tất cả</Button>
            </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {results.map((result, index) => (
          <div key={index} className="flex items-center justify-between p-3 border rounded-md bg-gray-50">
            <div className="flex items-center space-x-3">
              <div className="flex-1">
                <div className="font-medium">{result.filename}</div>
                <div className="text-sm text-gray-500">
                  SBD: {result.sbd || 'N/A'} | Điểm: {result.score?.toFixed(2) ?? 'N/A'} | HS: {result.student?.hoTen || 'Không khớp'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
                <Badge variant={result.matched ? "success" : "destructive"}>
                {result.matched ? "Đã khớp" : "Chưa khớp"}
                </Badge>
                {result.annotated_image && (
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm"><Eye className="w-4 h-4" /></Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl">
                            <DialogHeader>
                                <DialogTitle>Ảnh phiếu đã chấm - {result.filename}</DialogTitle>
                            </DialogHeader>
                            <div className="py-4">
                                <img src={`data:image/jpeg;base64,${result.annotated_image}`} alt={`Annotated result for ${result.filename}`} className="w-full h-auto rounded-md" />
                            </div>
                        </DialogContent>
                    </Dialog>
                )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
} 