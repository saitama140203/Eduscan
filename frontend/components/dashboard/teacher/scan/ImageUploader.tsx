"use client"

import React, { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Upload, X, Loader2, Plus, ImageIcon } from 'lucide-react';
import clsx from 'clsx';
import { useDropzone } from 'react-dropzone';

export const ImageUploader = ({ onFilesSelected, isProcessing, files, onFileRemove, onClearAll }: { 
  onFilesSelected: (files: FileList) => void; 
  isProcessing: boolean; 
  files: File[]; 
  onFileRemove: (file: File) => void;
  onClearAll: () => void;
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
        const dataTransfer = new DataTransfer();
        acceptedFiles.forEach(file => dataTransfer.items.add(file));
        onFilesSelected(dataTransfer.files);
    },
    accept: { 'image/jpeg': [], 'image/png': [] },
    disabled: isProcessing,
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Tải lên phiếu trả lời
                {files.length > 0 && <Badge variant="secondary">{files.length} ảnh</Badge>}
            </CardTitle>
            {files.length > 0 && (
                <Button variant="outline" size="sm" onClick={onClearAll} className="text-red-600 border-red-200 hover:bg-red-50">
                    <X className="w-4 h-4 mr-1" />Xóa tất cả
                </Button>
            )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div {...getRootProps()} className={clsx("relative border-2 border-dashed rounded-xl p-8 transition-all duration-300 cursor-pointer", isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-blue-400")}>
          <input {...getInputProps()} />
          <div className="text-center space-y-4">
            {isProcessing ? (
              <>
                <Loader2 className="w-12 h-12 text-blue-500 mx-auto animate-spin" />
                <div>
                  <p className="text-lg font-medium text-blue-600">Đang xử lý...</p>
                  <p className="text-sm text-muted-foreground">AI đang phân tích {files.length} phiếu trả lời</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto">
                  <Upload className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-900 mb-2">{isDragActive ? "Thả file vào đây" : "Kéo thả hoặc click để chọn file"}</p>
                  <p className="text-sm text-muted-foreground">Hỗ trợ JPG, PNG</p>
                </div>
              </>
            )}
          </div>
        </div>

        {files.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {files.map((file, i) => (
              <div key={`${file.name}-${i}`} className="relative group">
                <img src={URL.createObjectURL(file)} alt={file.name} className="w-full h-full object-cover aspect-square rounded-lg border" />
                <button onClick={() => onFileRemove(file)} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center">
                    <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
} 