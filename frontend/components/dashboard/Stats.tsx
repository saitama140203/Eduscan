"use client";

import { usePathname } from "next/navigation";
import {
  Users,
  BookOpen,
  FileText,
  School,
  GraduationCap,
  Scan,
  UserCheck
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStats } from "@/hooks/api/useStats";
import { useAuth } from "@/contexts/authContext";

interface StatItem {
  label: string;
  value: string;
  icon: any;
  changeType: "positive" | "negative" | "neutral";
}

export function Stats() {
  const pathname = usePathname();
  const { data } = useStats();
  const { user } = useAuth();

  let stats: StatItem[] = [];

  if (data) {
    if (user?.role === "admin") {
      const d: any = data;
      stats = [
        { label: "Organizations", value: String(d.organizations), icon: School, changeType: "neutral" },
        { label: "Managers", value: String(d.managers), icon: Users, changeType: "neutral" },
        { label: "Teachers", value: String(d.teachers), icon: UserCheck, changeType: "neutral" },
        { label: "Classes", value: String(d.classes), icon: BookOpen, changeType: "neutral" },
        { label: "Exams", value: String(d.exams), icon: FileText, changeType: "neutral" },
      ];
    } else if (user?.role === "manager") {
      const d: any = data;
      stats = [
        { label: "Classes", value: String(d.classes), icon: BookOpen, changeType: "neutral" },
        { label: "Teachers", value: String(d.teachers), icon: UserCheck, changeType: "neutral" },
        { label: "Students", value: String(d.students), icon: GraduationCap, changeType: "neutral" },
        { label: "Exams", value: String(d.exams), icon: FileText, changeType: "neutral" },
      ];
    } else if (user?.role === "teacher") {
      const d: any = data;
      stats = [
        { label: "My Classes", value: String(d.classes), icon: BookOpen, changeType: "neutral" },
        { label: "Created Exams", value: String(d.exams), icon: FileText, changeType: "neutral" },
        { label: "Scanned Sheets", value: String(d.answerSheets), icon: Scan, changeType: "neutral" },
      ];
    }
  }

  const getChangeColor = (changeType: "positive" | "negative" | "neutral") => {
    switch (changeType) {
      case "positive":
        return "text-green-600";
      case "negative":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className="transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <div className="h-8 w-8 bg-primary/10 rounded-md flex items-center justify-center">
                <Icon className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

