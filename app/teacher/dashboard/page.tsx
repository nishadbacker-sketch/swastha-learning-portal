"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import {
  BookOpen,
  ClipboardCheck,
  Users,
  BarChart3,
  Plus,
  Send,
  LogOut,
  Phone,
  MessageCircle,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  UserCheck,
  Clock,
  Layers,
  Globe,
} from "lucide-react";

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
  guardian_email: string | null;
};

type Activity = {
  id: string;
  title: string;
  description: string | null;
};

type ActivityAssignment = {
  id: string;
  student_id: string;
  activity_id: string;
  status: string;
  due_date: string | null;
  assigned_at: string;
};

type Level = "LP" | "UP" | "HS" | "HSS";

type Assessment = {
  id: string;
  student_id: string;
  assessment_level: Level;
  status: string;
  due_date: string | null;
  assigned_at: string;
};

const LEVELS: { value: Level; label: string; short: string; color: string }[] = [
  { value: "LP", label: "LP — Classes 1–4", short: "Classes 1–4", color: "#176b58" },
  { value: "UP", label: "UP — Classes 5–7", short: "Classes 5–7", color: "#2563eb" },
  { value: "HS", label: "HS — Classes 8–10", short: "Classes 8–10", color: "#7c3aed" },
  { value: "HSS", label: "HSS — Classes 11–12", short: "Classes 11–12", color: "#d97706" },
];

const roman: Record<string, number> = {
  I: 1, II: 2, III: 3, IV: 4,
  V: 5, VI: 6, VII: 7, VIII: 8,
  IX: 9, X: 10, XI: 11, XII: 12,
};

function getLevel(value: string | null): Level | null {
  if (!value) return null;

  const cleaned = value
    .trim()
    .toUpperCase()
    .replace(/^(CLASS|GRADE|STD|STANDARD)\s*[-:]?\s*/, "");

  const number = /^\d{1,2}$/.test(cleaned)
    ? Number(cleaned)
    : roman[cleaned];
