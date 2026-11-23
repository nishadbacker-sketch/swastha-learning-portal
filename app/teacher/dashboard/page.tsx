
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Student = {
  id: string;
  full_name: string;
  current_class: string | null;
  date_of_birth: string | null;
  student_code: string | null;
  preferred_language: string | null;
  status: string;
};

type Guardian = {
  student_id: string;
  parent_user_id: string;
  guardian_name: string | null;
  whatsapp_number: string | null;
  additional_contact_number: string | null;
  contact_number_differs: boolean | null;
};

type LearningActivity = {
  id: string;
  title: string;
  description: string | null;
};

type Assignment = {
  id: string;
  student_id: string;
  activity_id: string;
  due_date: string | null;
  status: string;
  assigned_at: string;
};

type AssessmentLevel = "LP" | "UP" | "HS" | "HSS";
type AssessmentAssignment = {
  id: string;
  student_id: string;
  assessment_level: AssessmentLevel;
  status: string;
  due_date: string | null;
  assigned_at: string;
};

const LEVELS: { value: AssessmentLevel; label: string }[] = [
  { value: "LP", label: "Lower Primary (Classes 1–4)" },
  { value: "UP", label: "Upper Primary (Classes 5–7)" },
  { value: "HS", label: "High School (Classes 8–10)" },
  { value: "HSS", label: "Higher Secondary (Classes 11–12)" },
];

function classLevel(currentClass: string | null): AssessmentLevel | null {
  if (!currentClass) return null;
  const normalized = currentClass.trim().toUpperCase();
  const match = normalized.match(/(?:CLASS|GRADE|STD|STANDARD)\s*[-:]?\s*(\d{1,2})\b/) ||
    normalized.match(/^(\d{1,2})\b/);
  const roman: Record<string, number> = {
    I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6,
    VII: 7, VIII: 8, IX: 9, X: 10, XI: 11, XII: 12,
  };
  const romanMatch = normalized.match(/(?:CLASS|GRADE|STD|STANDARD)\s*[-:]?\s*(XII|XI|VIII|VII|VI|IV|III|II|IX|X|V|I)\b/) ||
    normalized.match(/^(XII|XI|VIII|VII|VI|IV|III|II|IX|X|V|I)$/);
  const grade = match ? Number(match[1]) : romanMatch ? roman[romanMatch[1]] : NaN;
  if (grade >= 1 && grade <= 4) return "LP";
  if (grade >= 5 && grade <= 7) return "UP";
  if (grade >= 8 && grade <= 10) return "HS";
  if (grade >= 11 && grade <= 12) return "HSS";
  return null;
}

export default function TeacherDashboard() {
  const router = useRouter();

  const [userId, setUserId] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [profileStudentId, setProfileStudentId] = useState("");
  const [activities, setActivities] = useState<LearningActivity[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assessments, setAssessments] = useState<AssessmentAssignment[]>([]);
  const [assessmentLevel, setAssessmentLevel] = useState<AssessmentLevel>("LP");
  const [assessmentStudent, setAssessmentStudent] = useState("");
  const [assessmentDueDate, setAssessmentDueDate] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedActivity, setSelectedActivity] = useState("");
