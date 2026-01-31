// Type definitions for the School Attendance System

export type AttendanceStatus = 'P' | 'F' | 'J' | '-';
export type StudentSituation = 'Cursando' | 'Evasão' | 'Transferência';

export interface Class {
  id: string;
  name: string;
  year: string;
  period: string; // Manhã, Tarde, Noite, Integral
  lessonsPerDay?: number; // Agora configurável na tela de frequência
  createdAt: string;
}

export interface Student {
  id: string;
  name: string;
  registration: string;
  classId: string;
  situation: StudentSituation; // Novidade: Cursando, Evasão, Transferência
  photoUrl?: string;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  date: string; // YYYY-MM-DD format
  lessonIndex: number; // Novidade: 0, 1, 2 para suportar múltiplas aulas
  status: AttendanceStatus;
  notes?: string;
}

export interface Bimester {
  id: number;
  name: string;
  start: string;
  end: string;
}

export interface Holiday {
  id: string;
  date: string;
  description: string;
  type: 'Feriado' | 'Recesso' | 'Férias';
}

export const DEFAULT_BIMESTERS: Bimester[] = [
  { id: 1, name: '1º Bimestre', start: '2026-02-05', end: '2026-04-23' },
  { id: 2, name: '2º Bimestre', start: '2026-04-24', end: '2026-07-23' },
  { id: 3, name: '3º Bimestre', start: '2026-07-24', end: '2026-10-05' },
  { id: 4, name: '4º Bimestre', start: '2026-10-06', end: '2026-12-18' },
];

export interface AttendanceStats {
  totalDays: number;
  present: number;
  absent: number;
  justified: number;
  noClass: number;
  attendanceRate: number;
}

export interface ClassStats extends AttendanceStats {
  classId: string;
  className: string;
  totalStudents: number;
}

export interface StudentStats extends AttendanceStats {
  studentId: string;
  studentName: string;
}
