"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Save, Upload, AlertTriangle, Plus, X } from "lucide-react"
import Link from "next/link"
import { useExam, useExamAnswers, useCreateOrUpdateExamAnswers } from "@/hooks/useExams"
import { answerTemplatesApi } from "@/lib/api/answer-templates"
import type { AnswerSheetTemplate, OMRConfig } from "@/lib/api/answer-templates"
import * as XLSX from 'xlsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog"


// Types
type AnswerSet = Record<string, string>; // { [questionLabel]: answer }
type AllAnswers = Record<string, AnswerSet>; // { [examCode]: AnswerSet }
type AllScores = Record<string, number>; // { [questionLabel]: score }

interface AnswerBlock {
  name: string;
  fieldType: string;
  questions: {
    label: string; // e.g., "q1", "13_a"
    number: number; // e.g., 1, 2, 13, 14
  }[];
}

// Hàm kiểm tra giá trị hợp lệ
const isValidSymbolValue = (value: string): boolean => {
  // Kiểm tra giá trị có nằm trong danh sách bubble values không
  const validValues = ["-", ",", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
  return validValues.includes(value.toLowerCase());
};

// Hàm kiểm tra giá trị hợp lệ cho QTYPE_MCQ2
const isValidMCQ2Value = (value: string): boolean => {
  // Chỉ chấp nhận T hoặc F (không phân biệt hoa thường)
  return ['T', 'F'].includes(value.toUpperCase());
};

const parseQuestionLabel = (label: string): number => {
  const match = label.match(/\\d+/);
  return match ? parseInt(match[0], 10) : 0;
};

// Thêm hàm để phân tích label của câu hỏi MCQ2
const parseMCQ2Label = (label: string): { baseQuestion: string, subQuestion: string } => {
  // Tìm mẫu như "13_a", "14_b", v.v.
  const match = label.match(/^(\d+)_([a-d])$/);
  if (match) {
    return {
      baseQuestion: match[1], // "13"
      subQuestion: match[2]   // "a"
    };
  }
  
  // Nếu không tìm thấy mẫu trên, thử tìm mẫu khác
  const alternativeMatch = label.match(/^(\d+)([a-d])_?/);
  if (alternativeMatch) {
    return {
      baseQuestion: alternativeMatch[1], // "13"
      subQuestion: alternativeMatch[2]   // "a"
    };
  }
  
  // Nếu không tìm thấy mẫu nào, trả về giá trị mặc định
  return {
    baseQuestion: label,
    subQuestion: ""
  };
};

// Thêm hàm để nhóm các câu hỏi MCQ2 theo câu hỏi gốc
const groupMCQ2Questions = (questions: { label: string; number: number }[]): Record<string, { label: string; number: number; subQuestion: string }[]> => {
  const groups: Record<string, { label: string; number: number; subQuestion: string }[]> = {};
  
  questions.forEach((q) => {
    const { baseQuestion, subQuestion } = parseMCQ2Label(q.label);
    if (!groups[baseQuestion]) {
      groups[baseQuestion] = [];
    }
    groups[baseQuestion].push({
      ...q,
      subQuestion
    });
  });
  
  // Sắp xếp các câu hỏi phụ theo thứ tự a, b, c, d
  Object.keys(groups).forEach(key => {
    groups[key].sort((a, b) => a.subQuestion.localeCompare(b.subQuestion));
  });
  
  return groups;
};

// Thêm hàm để tìm câu hỏi từ định dạng phụ
const findQuestionBySubFormat = (questions: { label: string; number: number }[], baseNum: number, subChar?: string): { label: string; number: number } | undefined => {
  // Nếu không có subChar, tìm câu hỏi theo số
  if (!subChar) {
    return questions.find(q => q.number === baseNum);
  }
  
  // Nếu có subChar, tìm câu hỏi theo định dạng phụ
  return questions.find(q => {
    const { baseQuestion, subQuestion } = parseMCQ2Label(q.label);
    return parseInt(baseQuestion) === baseNum && subQuestion.toLowerCase() === subChar.toLowerCase();
  });
};

const groupQuestionsByBaseForScores = (
  questions: { label: string; number: number }[], 
  scores: AllScores, 
  answerBlocks: AnswerBlock[]
): { 
  groupedQuestions: Record<string, { label: string; number: number }[]>;
  groupedScores: Record<string, number>;
} => {
  const groupedQuestions: Record<string, { label: string; number: number }[]> = {};

  // Group all questions first
  questions.forEach(q => {
    const blockInfo = answerBlocks.find(b => b.questions.some(bq => bq.label === q.label));
    let key: string;

    if (blockInfo?.fieldType === 'QTYPE_INT10_SYMBOL') {
      const match = q.label.match(/^(\\d+)_/);
      key = match ? match[1] : q.label; // Group by number e.g. "17"
    } else {
      key = q.label; // Group by full label for individual questions to keep them separate
    }

    if (!groupedQuestions[key]) {
      groupedQuestions[key] = [];
    }
    groupedQuestions[key].push(q);
  });
  
  const groupedScores: Record<string, number> = {};
  // Calculate scores based on the new groups
  for (const key in groupedQuestions) {
    let totalScore = 0;
    groupedQuestions[key].forEach(q => {
      totalScore += scores[q.label] || 0;
    });
    groupedScores[key] = totalScore;
  }
  
  return { groupedQuestions, groupedScores };
};

const groupScoresForDisplay = (
  questions: { label: string; number: number }[],
  scores: AllScores,
  answerBlocks: AnswerBlock[]
) => {
  const scoreGroups: Record<string, {
    score: number;
    questions: { label: string; number: number }[];
    isGroup: boolean;
    displayLabel: string;
  }> = {};
  const processedLabels = new Set<string>();

  questions.forEach(q => {
    if (processedLabels.has(q.label)) return;

    const block = answerBlocks.find(b => b.questions.some(bq => bq.label === q.label));
    const isSymbolType = block?.fieldType === 'QTYPE_INT10_SYMBOL';
    const baseKeyMatch = q.label.match(/^(\d+)_/);

    if (isSymbolType && baseKeyMatch) {
      const baseKey = baseKeyMatch[1]; // e.g., "17"
      if (!scoreGroups[baseKey]) {
        const childQuestions = questions.filter(childQ =>
          childQ.label.startsWith(`${baseKey}_`)
        );
        let totalScore = 0;
        childQuestions.forEach(childQ => {
          totalScore += scores[childQ.label] || 0;
          processedLabels.add(childQ.label);
        });
        scoreGroups[baseKey] = {
          score: totalScore,
          questions: childQuestions,
          isGroup: true,
          displayLabel: `Câu ${baseKey}`,
        };
      }
    } else {
      let displayLabel = `Câu ${q.number}`;
      if (block?.fieldType === 'QTYPE_MCQ2') {
        const { baseQuestion, subQuestion } = parseMCQ2Label(q.label);
        if (subQuestion) {
          displayLabel = `Câu ${baseQuestion}${subQuestion.toUpperCase()}`;
        }
      }
      scoreGroups[q.label] = {
        score: scores[q.label] || 0,
        questions: [q],
        isGroup: false,
        displayLabel: displayLabel,
      };
      processedLabels.add(q.label);
    }
  });

  return scoreGroups;
};

export default function ExamAnswersPage() {
  const params = useParams()
  const { toast } = useToast()
  const examId = Number(params.examId)

  // Data Fetching
  const { data: exam, isLoading: isLoadingExam } = useExam(examId)
  const { data: existingAnswers, isLoading: isLoadingAnswers } = useExamAnswers(examId)
  const mutation = useCreateOrUpdateExamAnswers()

  // Component State
  const [template, setTemplate] = useState<AnswerSheetTemplate | null>(null)
  const [answerBlocks, setAnswerBlocks] = useState<AnswerBlock[]>([])
  const [allAnswers, setAllAnswers] = useState<AllAnswers>({ '000': {} }) // Start with a default exam code
  const [scores, setScores] = useState<AllScores>({})
  const [activeTab, setActiveTab] = useState<string>('000')
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(true)
  const [newExamCode, setNewExamCode] = useState("")

  // --- Effects ---

  // Effect to fetch template and derive answer blocks with sequential numbering
  useEffect(() => {
    if (exam?.maMauPhieu) {
      setIsLoadingTemplate(true);
      answerTemplatesApi.getTemplate(exam.maMauPhieu).then(data => {
        setTemplate(data);
        if (data.cauTrucJson?.omrConfig) {
          const omrConfig = data.cauTrucJson.omrConfig as OMRConfig;
          
          // Lưu trữ thông tin về loại trường
          const fieldTypeMap: Record<string, string> = {};
          Object.entries(omrConfig.fieldBlocks).forEach(([name, block]) => {
            fieldTypeMap[name] = block.fieldType;
          });
          
          let globalQuestionCounter = 1;
          const questionBlocks = Object.entries(omrConfig.fieldBlocks)
            .filter(([, block]) => block.fieldType.startsWith("QTYPE_MCQ") || block.fieldType.startsWith("QTYPE_INT10_SYMBOL"))
            .map(([name, block]) => ({
              name,
              fieldType: block.fieldType,
              questions: block.fieldLabels.map((label: string) => ({
                label,
                number: globalQuestionCounter++, // Assign sequential number
              })),
            }));
          setAnswerBlocks(questionBlocks);
        }
      }).finally(() => setIsLoadingTemplate(false));
    }
  }, [exam]);

  // Effect to populate state from existing saved answers
  useEffect(() => {
    if (existingAnswers) {
      const savedAnswers = existingAnswers.dapAnJson || {};
      if (Object.keys(savedAnswers).length > 0 && !Object.values(savedAnswers).some(v => typeof v === 'string')) {
         setAllAnswers(savedAnswers);
         const firstCode = Object.keys(savedAnswers)[0];
         if(firstCode) setActiveTab(firstCode);
      } else if (Object.keys(savedAnswers).length > 0) {
        // Handle old flat format
        setAllAnswers({ '000': savedAnswers });
        setActiveTab('000');
      }
      setScores(existingAnswers.diemMoiCauJson || {});
    }
  }, [existingAnswers]);

  // Effect to set default scores
  const setDefaultScores = useCallback(() => {
    if (exam && answerBlocks.length > 0) {
      const allQuestions = answerBlocks.flatMap(b => b.questions);
      const totalQuestions = allQuestions.length;
      const defaultScore = totalQuestions > 0 ? exam.tongDiem / totalQuestions : 0;
      
      const newScores: AllScores = {};
      allQuestions.forEach(q => {
        newScores[q.label] = defaultScore;
      });
      setScores(newScores);
    }
  }, [exam, answerBlocks]);

  useEffect(() => {
    if (Object.keys(scores).length === 0) {
        setDefaultScores();
    }
  }, [scores, setDefaultScores]);


  // --- Handlers ---

  const handleAnswerChange = (examCode: string, questionLabel: string, value: string) => {
    // Tìm loại trường của câu hỏi này
    const blockInfo = answerBlocks.find(block => 
      block.questions.some(q => q.label === questionLabel)
    );
    
    // Kiểm tra giá trị hợp lệ theo loại trường
    if (blockInfo?.fieldType === "QTYPE_INT10_SYMBOL" && value && !isValidSymbolValue(value)) {
      toast({
        title: "Giá trị không hợp lệ",
        description: "Chỉ chấp nhận các ký tự: 0-9, dấu trừ (-) và dấu phẩy (,)",
        variant: "destructive",
      });
      return;
    } else if (blockInfo?.fieldType === "QTYPE_MCQ2" && value && !isValidMCQ2Value(value)) {
      toast({
        title: "Giá trị không hợp lệ",
        description: "Chỉ chấp nhận T (True) hoặc F (False)",
        variant: "destructive",
      });
      return;
    }
    
    setAllAnswers(prev => ({
      ...prev,
      [examCode]: { ...prev[examCode], [questionLabel]: value.toUpperCase() },
    }));
  };

  const handleScoreChange = (questionLabel: string, value: string) => {
    setScores(prev => ({ ...prev, [questionLabel]: parseFloat(value) || 0 }));
  };

  const handleAddExamCode = () => {
    if (newExamCode && !allAnswers[newExamCode]) {
      setAllAnswers(prev => ({ ...prev, [newExamCode]: {} }));
      setActiveTab(newExamCode);
      setNewExamCode("");
    } else {
        toast({ title: "Lỗi", description: "Mã đề không hợp lệ hoặc đã tồn tại.", variant: "destructive" });
    }
  };

  const handleRemoveExamCode = (examCode: string) => {
    if (Object.keys(allAnswers).length <= 1) {
        toast({ title: "Không thể xóa", description: "Phải có ít nhất một mã đề.", variant: "destructive"});
        return;
    }
    setAllAnswers(prev => {
        const newState = { ...prev };
        delete newState[examCode];
        return newState;
    });
    // Switch to the first available tab
    const remainingCodes = Object.keys(allAnswers).filter(c => c !== examCode);
    setActiveTab(remainingCodes[0] || "");
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        
        const newAllAnswers: AllAnswers = {};
        const newScores: AllScores = {};
        const allQuestions = answerBlocks.flatMap(block => block.questions);

        console.log("All available questions from template (with sequential numbering):", allQuestions);

        workbook.SheetNames.forEach(sheetName => {
          const examCode = sheetName.trim();
          if (!examCode) return;
          
          const worksheet = workbook.Sheets[sheetName];
          // Read sheet as an array of arrays, ignoring headers
          const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          console.log(`Processing sheet "${examCode}" with raw rows:`, rows);

          const answerSet: AnswerSet = {};
          // Start from row 1 to skip potential header
          rows.slice(1).forEach((row, rowIndex) => {
            if (!row || row.length < 1) return;

            const questionLabel = String(row[0]); // Column A (label)
            const answer = String(row[1] || "");       // Column B
            const score = row.length > 2 ? Number(row[2]) : undefined; // Column C (optional)
            
            // Tìm câu hỏi dựa trên label
            const questionInfo = allQuestions.find(q => q.label === questionLabel);
            
            if (questionInfo) {
              // Xác định loại trường
              const blockInfo = answerBlocks.find(block => 
                block.questions.some(q => q.label === questionInfo.label)
              );

              let isValid = false;
              // Kiểm tra tính hợp lệ của câu trả lời
              if (blockInfo?.fieldType === "QTYPE_MCQ2") {
                if (isValidMCQ2Value(answer)) {
                  isValid = true;
                }
              } else if (blockInfo?.fieldType === "QTYPE_INT10_SYMBOL") {
                if (isValidSymbolValue(answer)) {
                  isValid = true;
                }
              } else {
                // Các loại khác (ví dụ: MCQ4, MCQ5)
                // Giả sử các câu trả lời khác đều hợp lệ ở đây
                isValid = true;
              }

              if (isValid) {
                answerSet[questionInfo.label] = answer.toUpperCase();

                // Cập nhật điểm nếu có
                if (score !== undefined && !isNaN(score)) {
                  newScores[questionInfo.label] = score;
                }
              } else {
                console.warn(`Invalid answer value "${answer}" for question "${questionLabel}" in sheet "${examCode}"`);
              }
            } else {
              console.warn(`Question with label "${questionLabel}" not found in template for sheet "${examCode}"`);
            }
          });
          newAllAnswers[examCode] = answerSet;
        });

        console.log("Processed answers to be set:", newAllAnswers);
        
        setAllAnswers(newAllAnswers);
        if (Object.keys(newScores).length > 0) {
            console.log("Processed scores to be set:", newScores);
            setScores(newScores);
        }
        
        const firstCode = Object.keys(newAllAnswers)[0];
        if (firstCode) setActiveTab(firstCode);
        
        toast({ title: "Tải lên thành công", description: `Đã nhập đáp án cho ${Object.keys(newAllAnswers).length} mã đề.` });
      } catch (error) {
        console.error("File processing error:", error);
        toast({ title: "Lỗi xử lý file", description: "Không thể đọc file excel. Vui lòng kiểm tra lại định dạng file và dữ liệu.", variant: "destructive" });
      }
    };
    reader.readAsArrayBuffer(file);
    // Clear input value to allow re-uploading the same file
    event.target.value = "";
  };

  // Thêm hàm xuất dữ liệu ra Excel
  const handleExportToExcel = useCallback(() => {
    try {
      const allQuestions = answerBlocks.flatMap(block => block.questions);
      const wb = XLSX.utils.book_new();
      
      // Tạo một sheet cho mỗi mã đề
      Object.entries(allAnswers).forEach(([examCode, answerSet]) => {
        // Nhóm các câu hỏi theo câu gốc
        const { groupedQuestions, groupedScores } = groupQuestionsByBaseForScores(allQuestions, scores, answerBlocks);
        
        const sheetData: any[][] = [
          ["STT", "Đáp án", "Điểm"] // Header
        ];
        
        // Xử lý từng nhóm câu hỏi
        Object.entries(groupedQuestions).forEach(([baseQuestion, questions]) => {
          // Xác định loại câu hỏi
          const firstQuestion = questions[0];
          const blockInfo = answerBlocks.find(block => 
            block.questions.some(q => q.label === firstQuestion.label)
          );
          
          if (blockInfo?.fieldType === "QTYPE_INT10_SYMBOL") {
            // Gộp các cột thành một câu trả lời duy nhất
            let combinedAnswer = "";
            questions.sort((a, b) => {
              const aOrder = a.label.match(/col(\d+)$/);
              const bOrder = b.label.match(/col(\d+)$/);
              if (aOrder && bOrder) {
                return parseInt(aOrder[1]) - parseInt(bOrder[1]);
              }
              return a.label.localeCompare(b.label);
            }).forEach(q => {
              combinedAnswer += answerSet[q.label] || "";
            });
            
            sheetData.push([
              baseQuestion, // Hiển thị số câu gốc (ví dụ: "17")
              combinedAnswer, // Kết hợp các giá trị (ví dụ: "7,83")
              groupedScores[baseQuestion] || 0 // Tổng điểm của nhóm
            ]);
          } else if (blockInfo?.fieldType === "QTYPE_MCQ2") {
            // Gộp các câu phụ thành một nhóm
            const subAnswers: Record<string, string> = {};
            
            questions.forEach(q => {
              const { subQuestion } = parseMCQ2Label(q.label);
              if (subQuestion) {
                const value = answerSet[q.label] || "";
                let displayValue = value;
                if (value === 'T') {
                  displayValue = 'T (Đúng)';
                } else if (value === 'F') {
                  displayValue = 'F (Sai)';
                }
                subAnswers[subQuestion.toUpperCase()] = displayValue;
              }
            });
            
            // Tạo chuỗi đáp án hợp nhất
            const combinedAnswer = Object.entries(subAnswers)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([sub, val]) => `${sub}: ${val}`)
              .join("; ");
            
            sheetData.push([
              baseQuestion, // Hiển thị số câu gốc (ví dụ: "13")
              combinedAnswer, // Kết hợp các giá trị (ví dụ: "A: T (Đúng); B: F (Sai); C: T (Đúng); D: F (Sai)")
              groupedScores[baseQuestion] || 0 // Tổng điểm của nhóm
            ]);
          } else {
            // Xử lý bình thường cho các loại khác
            questions.forEach(question => {
              sheetData.push([
                question.number,
                answerSet[question.label] || "",
                scores[question.label] || 0
              ]);
            });
          }
        });
        
        const ws = XLSX.utils.aoa_to_sheet(sheetData);
        XLSX.utils.book_append_sheet(wb, ws, examCode);
      });
      
      // Xuất file Excel
      XLSX.writeFile(wb, `dap_an_${examId}.xlsx`);
      toast({ title: "Xuất Excel thành công", description: "Đã xuất đáp án ra file Excel." });
    } catch (error) {
      console.error("Export error:", error);
      toast({ title: "Lỗi xuất Excel", description: "Không thể xuất dữ liệu ra Excel.", variant: "destructive" });
    }
  }, [allAnswers, answerBlocks, scores, examId, toast]);

  // Cập nhật phần handleCreateExcelTemplate để gộp các câu hỏi theo nhóm
  const handleCreateExcelTemplate = useCallback(() => {
    try {
      const allQuestions = answerBlocks.flatMap(block => block.questions);
      const wb = XLSX.utils.book_new();
      
      // Nhóm các câu hỏi theo câu gốc
      const { groupedQuestions, groupedScores } = groupQuestionsByBaseForScores(allQuestions, scores, answerBlocks);
      
      // Tạo một sheet mẫu
      const sheetData: any[][] = [
        ["STT", "Đáp án", "Điểm (tùy chọn)", "Ghi chú"] // Header
      ];
      
      // Thêm hướng dẫn
      sheetData.push(["", "", "", "Hướng dẫn: Nhập đáp án vào cột 'Đáp án', điểm vào cột 'Điểm (tùy chọn)'."]);
      sheetData.push(["", "", "", "Mỗi mã đề tạo 1 sheet riêng với tên là mã đề."]);
      
      // Xử lý từng nhóm câu hỏi
      Object.entries(groupedQuestions).forEach(([baseQuestion, questions]) => {
        // Xác định loại câu hỏi
        const firstQuestion = questions[0];
        const blockInfo = answerBlocks.find(block => 
          block.questions.some(q => q.label === firstQuestion.label)
        );
        
        if (blockInfo?.fieldType === "QTYPE_INT10_SYMBOL") {
          // Câu hỏi dạng số (nhiều cột)
          sheetData.push([
            baseQuestion, // Hiển thị số câu gốc (ví dụ: "17")
            "", // Đáp án để trống
            groupedScores[baseQuestion] || "", // Tổng điểm hiện tại
            "Nhập đáp án dạng số (nhiều chữ số, có thể có dấu - hoặc dấu ,)"
          ]);
        } else if (blockInfo?.fieldType === "QTYPE_MCQ2") {
          // Câu hỏi đúng/sai (nhiều câu phụ)
          // Thêm hướng dẫn cho từng câu phụ
          const subQuestions = questions.map(q => {
            const { subQuestion } = parseMCQ2Label(q.label);
            return subQuestion ? subQuestion.toUpperCase() : "";
          }).filter(Boolean).sort().join(", ");
          
          sheetData.push([
            baseQuestion, // Hiển thị số câu gốc (ví dụ: "13")
            "", // Đáp án để trống
            groupedScores[baseQuestion] || "", // Tổng điểm hiện tại
            `Nhập T (đúng) hoặc F (sai) cho các câu phụ: ${subQuestions}`
          ]);
          
          // Thêm mẫu cho từng câu phụ
          questions.forEach(q => {
            const { subQuestion } = parseMCQ2Label(q.label);
            if (subQuestion) {
              sheetData.push([
                `${baseQuestion}${subQuestion.toUpperCase()}`, // Hiển thị như "13A", "13B"
                "", // Đáp án để trống
                "", // Điểm để trống (đã tính ở câu gốc)
                "T hoặc F"
              ]);
            }
          });
        } else {
          // Câu hỏi thông thường
          questions.forEach(q => {
            sheetData.push([
              q.number,
              "", // Đáp án để trống
              scores[q.label] || "", // Điểm hiện tại
              blockInfo?.fieldType === "QTYPE_MCQ4" ? "Nhập A, B, C hoặc D" : 
              blockInfo?.fieldType === "QTYPE_MCQ5" ? "Nhập A, B, C, D hoặc E" : ""
            ]);
          });
        }
      });
      
      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      XLSX.utils.book_append_sheet(wb, ws, "Mẫu");
      
      // Xuất file Excel
      XLSX.writeFile(wb, `mau_dap_an_${examId}.xlsx`);
      toast({ title: "Tạo mẫu Excel thành công", description: "Đã tạo mẫu Excel để nhập đáp án." });
    } catch (error) {
      console.error("Template creation error:", error);
      toast({ title: "Lỗi tạo mẫu", description: "Không thể tạo mẫu Excel.", variant: "destructive" });
    }
  }, [answerBlocks, scores, examId, toast]);

  const handleSubmit = async () => {
    const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);
    if (Math.abs(totalScore - (exam?.tongDiem ?? 10)) > 0.01) {
      toast({
        title: "Lỗi tổng điểm",
        description: `Tổng điểm các câu (${totalScore.toFixed(2)}) không khớp với tổng điểm của bài thi (${exam?.tongDiem ?? 10}).`,
        variant: "destructive",
      });
      return;
    }
    
    await mutation.mutateAsync({
      examId,
      answersData: { answers: allAnswers, scores },
    });
  };
  
  const isLoading = isLoadingExam || isLoadingAnswers || isLoadingTemplate;

  // Thêm hàm để nhóm các label theo cấu trúc câu hỏi
  const groupQuestionsByBase = (questions: { label: string; number: number }[]): Record<string, { label: string; number: number }[]> => {
    const groups: Record<string, { label: string; number: number }[]> = {};
    
    questions.forEach((q) => {
      // Xử lý các label có dạng "17_col1", "17_col2" hoặc "q1", "q2"
      const baseMatch = q.label.match(/^(\d+)_?/);
      if (baseMatch) {
        const baseQuestion = baseMatch[1];
        if (!groups[baseQuestion]) {
          groups[baseQuestion] = [];
        }
        groups[baseQuestion].push(q);
      } else {
        // Nếu không có mẫu phù hợp, sử dụng toàn bộ label
        if (!groups[q.label]) {
          groups[q.label] = [];
        }
        groups[q.label].push(q);
      }
    });
    
    // Sắp xếp các cột trong mỗi nhóm theo thứ tự tự nhiên
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => {
        const aOrder = a.label.match(/col(\d+)$/);
        const bOrder = b.label.match(/col(\d+)$/);
        if (aOrder && bOrder) {
          return parseInt(aOrder[1]) - parseInt(bOrder[1]);
        }
        return a.label.localeCompare(b.label);
      });
    });
    
    return groups;
  };

  // Thêm hàm để lấy giá trị hiển thị cho các trường QTYPE_INT10_SYMBOL
  const getSymbolDisplayValue = (value: string): string => {
    if (!value) return '';
    
    // Xử lý các ký tự đặc biệt theo định nghĩa trong constants.py
    switch (value.toUpperCase()) {
      case '-': return '−'; // Dấu trừ Unicode
      case ',': return ','; // Dấu phẩy
      default: return value.toUpperCase();
    }
  };

  // Thêm hàm để chuyển đổi giá trị hiển thị thành giá trị lưu trữ
  const getStorageValue = (displayValue: string): string => {
    if (!displayValue) return '';
    
    // Chuyển đổi các ký tự hiển thị đặc biệt thành giá trị lưu trữ
    switch (displayValue) {
      case '−': return '-'; // Dấu trừ Unicode thành dấu trừ ASCII
      default: return displayValue;
    }
  };

  // Thêm hàm để hiển thị các ký tự đặc biệt
  const renderSpecialCharacters = () => {
    // Sử dụng đúng thứ tự từ constants.py: ["-", ",", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]
    const specialChars = [
      { display: '−', value: '-' },
      { display: ',', value: ',' },
      { display: '0', value: '0' },
      { display: '1', value: '1' },
      { display: '2', value: '2' },
      { display: '3', value: '3' },
      { display: '4', value: '4' },
      { display: '5', value: '5' },
      { display: '6', value: '6' },
      { display: '7', value: '7' },
      { display: '8', value: '8' },
      { display: '9', value: '9' },
    ];
    
    return (
      <div className="flex flex-wrap justify-center gap-1 mt-2">
        {specialChars.map(char => (
          <button
            key={`char-${char.value}`}
            type="button"
            className="w-8 h-8 flex items-center justify-center border rounded hover:bg-gray-100 text-sm"
            onClick={() => {
              // Lấy phần tử đang được focus
              const activeElement = document.activeElement as HTMLInputElement;
              if (activeElement && activeElement.tagName === 'INPUT') {
                // Cập nhật giá trị
                const examCode = activeElement.id.split('-')[1];
                const questionLabel = activeElement.id.split('-')[2];
                handleAnswerChange(examCode, questionLabel, char.value);
                
                // Focus vào phần tử tiếp theo (nếu có)
                const inputs = Array.from(document.querySelectorAll('input[id^="q-"]'));
                const currentIndex = inputs.indexOf(activeElement);
                if (currentIndex < inputs.length - 1) {
                  (inputs[currentIndex + 1] as HTMLInputElement).focus();
                }
              }
            }}
          >
            {char.display}
          </button>
        ))}
      </div>
    );
  };

  // Cập nhật hàm renderMCQ2Input để hiển thị đúng số câu hỏi
  const renderMCQ2Input = (code: string, label: string, number: number, subQuestion: string, value: string, onChange: (value: string) => void) => {
    // Xác định câu hỏi gốc và câu hỏi phụ
    const { baseQuestion } = parseMCQ2Label(label);
    const displaySubQuestion = subQuestion ? subQuestion.toUpperCase() : "";
    
    return (
      <div className="flex flex-col space-y-2">
        <Label className="text-center font-medium">
          Câu {baseQuestion}{displaySubQuestion}:
        </Label>
        <div className="flex items-center justify-center space-x-4">
          <div className="flex items-center space-x-2">
            <input
              type="radio"
              id={`q-${code}-${label}-T`}
              name={`q-${code}-${label}`}
              checked={value === 'T'}
              onChange={() => onChange('T')}
              className="w-4 h-4"
            />
            <Label htmlFor={`q-${code}-${label}-T`} className="cursor-pointer">Đúng (T)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="radio"
              id={`q-${code}-${label}-F`}
              name={`q-${code}-${label}`}
              checked={value === 'F'}
              onChange={() => onChange('F')}
              className="w-4 h-4"
            />
            <Label htmlFor={`q-${code}-${label}-F`} className="cursor-pointer">Sai (F)</Label>
          </div>
        </div>
      </div>
    );
  };

  // Cập nhật hàm để lấy số câu gốc từ label
  const getBaseQuestionNumber = (label: string): number => {
    // Xử lý cho QTYPE_INT10_SYMBOL (17_col1, 17_col2, v.v.)
    const intSymbolMatch = label.match(/^(\d+)_col\d+$/);
    if (intSymbolMatch) {
      return parseInt(intSymbolMatch[1]); // "17" -> 17
    } 
    
    // Xử lý cho QTYPE_MCQ2 (13_a, 13_b, v.v.)
    const mcq2Match = label.match(/^(\d+)_[a-d]$/);
    if (mcq2Match) {
      return parseInt(mcq2Match[1]); // "13" -> 13
    }
    
    // Xử lý cho câu hỏi thông thường
    return parseQuestionLabel(label);
  };

  if (isLoading) {
    return (
        <div className="container mx-auto py-6">
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-1/2" />
                    <Skeleton className="h-4 w-1/3" />
                </CardHeader>
                <CardContent>
                    <div className="space-y-8">
                        <Skeleton className="h-48 w-full" />
                        <Skeleton className="h-48 w-full" />
                    </div>
                </CardContent>
            </Card>
        </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Nhập đáp án cho bài thi: {exam?.tieuDe}</CardTitle>
              <CardDescription>
                Dựa trên mẫu phiếu: <span className="font-semibold text-primary">{template?.tenMauPhieu ?? "Đang tải..."}</span>
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
                <Input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} className="hidden" id="file-upload" />
                <Button variant="outline" onClick={() => document.getElementById('file-upload')?.click()}>
                    <Upload className="mr-2 h-4 w-4"/> Tải lên từ Excel
                </Button>
                <Button variant="outline" onClick={handleExportToExcel}>
                    <ArrowLeft className="rotate-180 mr-2 h-4 w-4"/> Xuất Excel
                </Button>
                <Button variant="outline" onClick={handleCreateExcelTemplate}>
                    <Plus className="mr-2 h-4 w-4"/> Tạo mẫu Excel
                </Button>
                <Button onClick={handleSubmit} disabled={mutation.isPending}>
                    <Save className="mr-2 h-4 w-4" /> {mutation.isPending ? "Đang lưu..." : "Lưu đáp án"}
                </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="flex items-center border-b mb-4">
                    <TabsList className="mr-auto">
                        {Object.keys(allAnswers).map(code => (
                            <div key={code} className="relative group flex items-center">
                                <TabsTrigger value={code}>
                                    Mã đề {code}
                                </TabsTrigger>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <button 
                                            onClick={(e) => { e.preventDefault(); }} 
                                            className="absolute top-1/2 -translate-y-1/2 right-1 w-4 h-4 rounded-full bg-gray-300 hover:bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                            aria-label={`Xóa mã đề ${code}`}
                                        >
                                            <X size={12} />
                                        </button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                        <AlertDialogTitle>Xóa mã đề?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Bạn có chắc muốn xóa bộ đáp án cho mã đề "{code}"? Hành động này không thể hoàn tác.
                                        </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                        <AlertDialogCancel>Hủy</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleRemoveExamCode(code)}>Xóa</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        ))}
                    </TabsList>
                    <div className="flex items-center gap-2 pl-4">
                        <Input value={newExamCode} onChange={e => setNewExamCode(e.target.value)} placeholder="Nhập mã đề mới" className="h-8 w-32" />
                        <Button onClick={handleAddExamCode} size="sm" variant="outline"><Plus className="h-4 w-4 mr-1" />Thêm</Button>
                    </div>
                </div>

                {Object.entries(allAnswers).map(([code, answerSet]) => (
                    <TabsContent key={code} value={code} className="mt-0">
                        {answerBlocks.length > 0 ? (
                            <div className="space-y-6">
                                {answerBlocks.map((block) => (
                                    <div key={block.name} className="p-4 border rounded-lg bg-background">
                                        <h3 className="text-lg font-semibold mb-4 border-b pb-2">{block.name}</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-4">
                                        {block.fieldType === "QTYPE_INT10_SYMBOL" ? (
                                            // Xử lý đặc biệt cho QTYPE_INT10_SYMBOL - nhóm các cột theo câu hỏi cơ sở
                                            Object.entries(groupQuestionsByBase(block.questions)).map(([baseQuestion, columns]) => (
                                                <div key={`group-${baseQuestion}`} className="flex flex-col space-y-2">
                                                    <Label className="text-center font-medium">
                                                        Câu {baseQuestion}:
                                                    </Label>
                                                    <div className="flex flex-col items-center justify-center space-y-2">
                                                        <div className="flex items-center justify-center space-x-1">
                                                            {columns.map((col) => (
                                                                <Input 
                                                                    key={col.label} 
                                                                    id={`q-${code}-${col.label}`} 
                                                                    value={answerSet[col.label] ? getSymbolDisplayValue(answerSet[col.label]) : ""} 
                                                                    onChange={(e) => handleAnswerChange(code, col.label, getStorageValue(e.target.value))} 
                                                                    className="text-center font-mono w-12 h-10" 
                                                                    maxLength={1} 
                                                                />
                                                            ))}
                                                        </div>
                                                        <div className="text-xs text-gray-500 flex space-x-1">
                                                            {columns.map((col, idx) => (
                                                                <span key={`hint-${col.label}`} className="w-12 text-center">{`Cột ${idx + 1}`}</span>
                                                            ))}
                                                        </div>
                                                        {renderSpecialCharacters()}
                                                    </div>
                                                </div>
                                            ))
                                        ) : block.fieldType === "QTYPE_MCQ2" ? (
                                            // Xử lý đặc biệt cho QTYPE_MCQ2 (True/False)
                                            // Nhóm các câu hỏi theo câu hỏi gốc
                                            Object.entries(groupMCQ2Questions(block.questions)).map(([baseQuestion, subQuestions]) => (
                                                <div key={`mcq2-group-${baseQuestion}`} className="col-span-1 md:col-span-2 lg:col-span-4 p-4 border rounded-lg bg-gray-50 mb-4">
                                                    <h4 className="text-md font-medium mb-3 border-b pb-2">Câu {baseQuestion}:</h4>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                                        {subQuestions.map(({ label, number, subQuestion }) => (
                                                            <div key={label} className="p-2 border rounded bg-white">
                                                                {renderMCQ2Input(
                                                                    code, 
                                                                    label, 
                                                                    number, 
                                                                    subQuestion,
                                                                    answerSet[label] || "", 
                                                                    (value) => handleAnswerChange(code, label, value)
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            // Xử lý thông thường cho các loại khác
                                            block.questions.map(({ label, number }) => (
                                                <div key={label} className="flex items-center space-x-3">
                                                    <Label htmlFor={`q-${code}-${label}`} className="w-20 text-right">Câu {number}:</Label>
                                                    <div className="flex-1">
                                                        <Input id={`q-${code}-${label}`} value={answerSet[label] || ""} onChange={(e) => handleAnswerChange(code, label, e.target.value)} className="text-center font-mono" maxLength={1} />
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10 bg-gray-50 rounded-md">
                                <AlertTriangle className="mx-auto h-10 w-10 text-yellow-500" />
                                <p className="mt-4 text-lg font-medium">Không tìm thấy cấu trúc câu hỏi</p>
                            </div>
                        )}
                    </TabsContent>
                ))}
            </Tabs>
             <div className="mt-6 p-4 border rounded-lg">
                <h3 className="text-lg font-semibold mb-4 border-b pb-2">Bảng điểm</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-4">
                    {(() => {
                        const allQuestions = answerBlocks.flatMap(b => b.questions);
                        const scoreGroups = groupScoresForDisplay(allQuestions, scores, answerBlocks);
                        
                        const sortedKeys = Object.keys(scoreGroups).sort((a, b) => {
                          const itemA = scoreGroups[a];
                          const itemB = scoreGroups[b];
                          const numA = itemA.questions[0]?.number || 0;
                          const numB = itemB.questions[0]?.number || 0;
                          return numA - numB;
                        });

                        return sortedKeys.map((key) => {
                            const group = scoreGroups[key];
                            
                            if (group.isGroup) { // Render grouped input
                              return (
                                <div key={`score-group-${key}`} className="flex items-center space-x-3">
                                  <Label htmlFor={`score-group-${key}`} className="w-20 text-right">{group.displayLabel}:</Label>
                                  <div className="flex-1">
                                    <Input 
                                      id={`score-group-${key}`} type="number" step="0.01" 
                                      value={Number(group.score).toFixed(2)} 
                                      onChange={(e) => {
                                        const newGroupScore = parseFloat(e.target.value) || 0;
                                        const perQuestionScore = group.questions.length > 0 ? newGroupScore / group.questions.length : 0;
                                        const newScores = { ...scores };
                                        group.questions.forEach(q => { newScores[q.label] = perQuestionScore; });
                                        setScores(newScores);
                                      }} 
                                      className="text-center" placeholder="Điểm" 
                                    />
                                  </div>
                                </div>
                              );
                            } else { // Render individual input
                              const question = group.questions[0];
                              return (
                                <div key={`score-${question.label}`} className="flex items-center space-x-3">
                                  <Label htmlFor={`score-${question.label}`} className="w-20 text-right">{group.displayLabel}:</Label>
                                  <Input 
                                    id={`score-${question.label}`} type="number" step="0.01" 
                                    value={Number(group.score).toFixed(2)} 
                                    onChange={(e) => handleScoreChange(question.label, e.target.value)} 
                                    className="text-center" placeholder="Điểm" 
                                  />
                                </div>
                              );
                            }
                        });
                    })()}
                </div>
                 <div className="mt-4 text-right">
                    <Button onClick={setDefaultScores} variant="link">Áp dụng điểm mặc định cho tất cả câu</Button>
                </div>
            </div>
        </CardContent>
        <CardFooter className="flex justify-between items-center">
            <Link href={`/dashboard/teacher/classes/${params.classId}/exams/${examId}`}>
                <Button variant="outline">
                    <ArrowLeft className="mr-2 h-4 w-4"/> Quay lại
                </Button>
            </Link>
            <div className="text-right">
                <p className="text-sm text-muted-foreground">
                    Tổng điểm đã nhập: <span className="font-bold text-primary">{Object.values(scores).reduce((s, c) => s + c, 0).toFixed(2)}</span> / {exam?.tongDiem}
                </p>
            </div>
        </CardFooter>
      </Card>
    </div>
  )
} 