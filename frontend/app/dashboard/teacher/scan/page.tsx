"use client"

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useQuery } from "@tanstack/react-query"
import { useRouter, useSearchParams } from 'next/navigation'
import { useToast } from "@/components/ui/use-toast"
import Webcam from 'react-webcam'
import {
  Camera, Play, Square, CheckCircle,
  AlertCircle, Loader2, XCircle, Users, FileText, Target, Upload, Grid, List, ChevronRight, Scan, ImageIcon, Video, Brain, Zap, Plus, RotateCcw, Download, Eye, Clock, BarChart3, Settings, Wifi, WifiOff, ArrowLeft, Save, CameraOff
} from "lucide-react"
import clsx from "clsx"
import Link from 'next/link'
import dynamic from 'next/dynamic'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'

import { classesApi, type Class } from "@/lib/api/classes"
import { examsApi, type Exam } from "@/lib/api/exams"
import { omrApi } from "@/lib/api/omr"
import { useOMRWebSocket, OMRProgressData, CompleteDetails, RecognitionFailedDetails } from '@/lib/hooks/useOMRWebSocket'
import type { ScanResult } from '@/types/scan'

// Import components con
import { ClassSelector } from '@/components/dashboard/teacher/scan/ClassSelector'
import { ExamSelector } from '@/components/dashboard/teacher/scan/ExamSelector'
import { ScanModeSelector } from '@/components/dashboard/teacher/scan/ScanModeSelector'
import { ImageUploader } from '@/components/dashboard/teacher/scan/ImageUploader'
import { ResultsDisplay } from '@/components/dashboard/teacher/scan/ResultsDisplay'
import { WebcamScanner } from '@/components/dashboard/teacher/scan/WebcamScanner'


// Main Page Component

export default function OMRScanPage() {
    // --- Hooks ---
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const webcamRef = useRef<Webcam>(null);

    // --- State Management ---
    const [isClient, setIsClient] = useState(false);
    const [selectedClassId, setSelectedClassId] = useState<number | null>(() => Number(searchParams.get('classId')) || null);
    const [selectedExamId, setSelectedExamId] = useState<number | null>(() => Number(searchParams.get('examId')) || null);
    const [scanMode, setScanMode] = useState<'upload' | 'webcam' | null>('webcam');
    
    // State cho cả hai chế độ
    const [scanResults, setScanResults] = useState<ScanResult[]>([]);
    
    // State riêng cho chế độ Upload
    const [files, setFiles] = useState<File[]>([]);
    const [isBatchProcessing, setIsBatchProcessing] = useState(false);
    const [isSavingResults, setIsSavingResults] = useState(false);

    // Webcam-mode state
    const [statusMessage, setStatusMessage] = useState('Sẵn sàng để quét');
    const [recognitionStatus, setRecognitionStatus] = useState<OMRProgressData['status']>('idle');
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [lastSuccessfulResult, setLastSuccessfulResult] = useState<CompleteDetails | null>(null);

    // --- Data Fetching ---
    const { data: classes, isLoading: isLoadingClasses } = useQuery<Class[]>({
        queryKey: ['teacherClasses'],
        queryFn: () => classesApi.getClasses({}),
    });

    const { data: exams, isLoading: isLoadingExams } = useQuery<Exam[]>({
        queryKey: ['teacherExams', selectedClassId],
        queryFn: () => examsApi.getExams({ class_id: selectedClassId! }),
        enabled: !!selectedClassId,
    });
    
    // --- Memoized Values ---
    const selectedExam = useMemo(() => (exams || []).find(e => e.maBaiKiemTra === selectedExamId), [exams, selectedExamId]);
    
    // --- WebSocket Hook ---
    const { 
        isConnected, isScanning, startScanning, captureFrame, disconnect,
    } = useOMRWebSocket({
        examId: selectedExamId ?? undefined,
        templateId: selectedExam?.maMauPhieu ?? undefined,
        onProgress: (data) => {
            setStatusMessage(data.message);
            setRecognitionStatus(data.status);
            if (data.status === 'recognition_failed' || data.status === 'complete') {
                const details = data.details as RecognitionFailedDetails | CompleteDetails;
                setPreviewImage(details.aligned_image || null);
            } else {
                setPreviewImage(null);
            }
        },
        onResultSaved: (result) => {
            if (result.success) {
                setLastSuccessfulResult(result);
                toast({ title: "Chấm thành công!", description: `SBD ${result.sbd} - Điểm: ${result.total_score}` });
                setScanResults(prev => [{
                    filename: `webcam_${Date.now()}.jpg`,
                    sbd: result.sbd || null,
                    student: result.student_id ? { maHocSinh: result.student_id, hoTen: result.student_name || null, maHocSinhTruong: result.student_code || null } : null,
                    score: result.total_score,
                    answers: result.details || {},
                    matched: !!result.student_id,
                    ma_de: result.ma_de || null,
                    annotated_image: result.aligned_image || null,
                    annotated_image_path: result.annotated_image_path || null,
                }, ...prev]);
            }
        },
    });

    // --- Handlers ---
    const handleFilesSelected = (selectedFiles: FileList | null) => {
        if (!selectedFiles) return;
        setFiles(prev => [...prev, ...Array.from(selectedFiles)]);
    };

    const handleStartProcessing = async () => {
        if (!selectedExamId || !selectedExam?.maMauPhieu) {
            toast({ title: "Thiếu thông tin", description: "Vui lòng chọn lớp và bài thi.", variant: "destructive" });
            return;
        }
        if (files.length === 0) {
            toast({ title: "Chưa có ảnh", description: "Vui lòng tải lên ảnh phiếu trả lời.", variant: "destructive" });
            return;
        }

        setIsBatchProcessing(true);
        toast({ title: "Đang xử lý", description: `Bắt đầu chấm ${files.length} phiếu...` });

        try {
            const result = await omrApi.processBatch({
                examId: selectedExamId,
                templateId: selectedExam.maMauPhieu,
                files: files,
                classId: selectedClassId || undefined,
            });

            if (result.success && result.scoring_result?.results) {
                const scoringData = result.scoring_result.results;
                const annotatedImages = result.annotated_images || {};
                
                const newResults: ScanResult[] = scoringData.map((item: any) => {
                    const filename = item.filename || '';
                    return {
                        filename: filename,
                        sbd: item.sbd || null,
                        student: item.student_id ? {
                            maHocSinh: item.student_id,
                            hoTen: item.student_name || null,
                            maHocSinhTruong: item.student_code || null,
                        } : null,
                        score: item.total_score,
                        answers: item.details || {},
                        matched: !!item.student_id,
                        ma_de: item.ma_de || null,
                        annotated_image: annotatedImages[filename] || item.annotated_image_path || null,
                        annotated_image_path: item.annotated_image_path || null,
                    };
                });

                setScanResults(prev => [...prev, ...newResults]);
                setFiles([]); // Xóa file đã xử lý
                toast({ title: "Hoàn tất!", description: `Đã chấm xong ${newResults.length} phiếu.` });
            } else {
                toast({ title: "Lỗi xử lý", description: result.summary?.message || "Không có kết quả trả về.", variant: "destructive" });
            }
        } catch (error: any) {
            toast({ title: "Lỗi hệ thống", description: error.message || "Có lỗi xảy ra khi chấm bài.", variant: "destructive" });
        } finally {
            setIsBatchProcessing(false);
        }
    };

    const handleSaveAllResults = async () => {
        if (!selectedExamId || scanResults.length === 0) return;
        setIsSavingResults(true);

        const payload = {
            exam_id: selectedExamId,
            results: scanResults.map(r => {
                // Chuyển đổi mảng details thành object answers
                const studentAnswers: Record<string, string> = {};
                if (Array.isArray(r.answers)) {
                    r.answers.forEach((ans: any) => {
                        if (ans.question_id) {
                            studentAnswers[ans.question_id] = ans.student_answer || "";
                        }
                    });
                }

                return {
                    student_answers: studentAnswers,
                    sbd: r.sbd || '',
                    filename: r.filename,
                    annotated_image_path: r.annotated_image_path || null
                }
            })
        };

        try {
            await omrApi.saveResults(payload);
            toast({ title: "Thành công", description: "Đã lưu tất cả kết quả." });
            setScanResults([]); // Xóa kết quả sau khi lưu thành công
        } catch (error: any) {
            toast({ title: "Lỗi", description: `Lưu kết quả thất bại: ${error.message}`, variant: "destructive" });
        } finally {
            setIsSavingResults(false);
        }
    };

    const handleCapture = useCallback(() => {
        if (webcamRef.current) {
            const imageSrc = webcamRef.current.getScreenshot();
            if (imageSrc) {
                setLastSuccessfulResult(null);
                setPreviewImage(null);
                setStatusMessage('Đang xử lý...');
                setRecognitionStatus('processing');
                captureFrame(imageSrc);
            }
        }
    }, [webcamRef, captureFrame]);

    // --- Effects ---
    useEffect(() => {
        setIsClient(true);
    }, []);

    // --- Render ---
    if (!isClient) {
        return <div className="flex items-center justify-center h-screen"><Loader2 className="h-16 w-16 animate-spin text-blue-500" /></div>;
    }

    return (
        <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Chấm điểm OMR</h1>
            <div className="space-y-6">
                <ClassSelector classes={classes || []} selectedClass={(classes || []).find(c => c.maLopHoc === selectedClassId) || null} onSelect={(cls) => setSelectedClassId(cls.maLopHoc)} isLoading={isLoadingClasses} />
                {selectedClassId && <ExamSelector exams={exams || []} selectedExam={selectedExam || null} onSelect={(exam) => setSelectedExamId(exam.maBaiKiemTra)} isLoading={isLoadingExams} />}
                {selectedExamId && <ScanModeSelector onModeSelect={setScanMode} selectedMode={scanMode} />}
            </div>

            {scanMode === 'upload' && selectedExamId && (
                <div className="space-y-6">
                    <ImageUploader 
                        files={files}
                        isProcessing={isBatchProcessing}
                        onFilesSelected={handleFilesSelected}
                        onFileRemove={(file) => setFiles(f => f.filter(i => i !== file))}
                        onClearAll={() => setFiles([])}
                    />
                    {files.length > 0 && !isBatchProcessing && (
                        <Button onClick={handleStartProcessing}>
                           <Zap className="w-4 h-4 mr-2" /> Bắt đầu chấm bài
                        </Button>
                    )}
                    {isBatchProcessing && (
                         <Button disabled><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang xử lý...</Button>
                    )}
                </div>
            )}
            
            {scanMode === 'webcam' && selectedExamId && (
                 <WebcamScanner
                    isConnected={isConnected}
                    isScanning={isScanning}
                    statusMessage={statusMessage}
                    recognitionStatus={recognitionStatus}
                    previewImage={previewImage}
                    lastSuccessfulResult={lastSuccessfulResult}
                    onStartScan={startScanning}
                    onStopScan={disconnect}
                    onCapture={handleCapture}
                    webcamRef={webcamRef}
                />
            )}

            {scanResults.length > 0 && (
                 <ResultsDisplay 
                    results={scanResults} 
                    onSaveAll={handleSaveAllResults}
                    onClearResults={() => setScanResults([])}
                    isSaving={isSavingResults}
                    onNewBatch={() => { setFiles([]); setScanResults([]) }}
                 />
            )}
        </div>
    );
}