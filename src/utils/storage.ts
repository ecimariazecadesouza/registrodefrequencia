// LocalStorage utility functions for data persistence

import type { Class, Student, AttendanceRecord, AttendanceStats, StudentStats, Bimester } from '../types';
import { DEFAULT_BIMESTERS } from '../types';

export const STORAGE_KEYS = {
    CLASSES: 'school_classes',
    STUDENTS: 'school_students',
    ATTENDANCE: 'school_attendance',
    BIMESTERS: 'school_bimesters',
};

// Generic storage functions
const getFromStorage = <T>(key: string): T[] => {
    try {
        const data = localStorage.getItem(key);
        if (!data) return [];
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error loading ${key} from storage:`, error);
        return [];
    }
};

export const saveToStorage = <T>(key: string, data: T[]): void => {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.error(`Error saving ${key} to storage:`, error);
    }
};

// Classes
export const getClasses = (): Class[] => getFromStorage<Class>(STORAGE_KEYS.CLASSES);

export const saveClass = (classData: Class): void => {
    const classes = getClasses();
    const index = classes.findIndex(c => c.id === classData.id);
    if (index >= 0) {
        classes[index] = classData;
    } else {
        classes.push(classData);
    }
    saveToStorage(STORAGE_KEYS.CLASSES, classes);
};

export const deleteClass = (classId: string): void => {
    const classes = getClasses().filter(c => String(c.id) !== String(classId));
    saveToStorage(STORAGE_KEYS.CLASSES, classes);

    // Also delete related students and attendance
    const students = getStudents().filter(s => String(s.classId) !== String(classId));
    saveToStorage(STORAGE_KEYS.STUDENTS, students);

    const studentIds = getStudents()
        .filter(s => String(s.classId) === String(classId))
        .map(s => s.id);
    const attendance = getAttendance().filter(a => !studentIds.some(id => String(id) === String(a.studentId)));
    saveToStorage(STORAGE_KEYS.ATTENDANCE, attendance);
};

// Students
export const getStudents = (): Student[] => getFromStorage<Student>(STORAGE_KEYS.STUDENTS);

export const getStudentsByClass = (classId: string): Student[] => {
    return getStudents().filter(s => String(s.classId) === String(classId));
};

export const saveStudent = (student: Student): void => {
    const students = getStudents();
    const index = students.findIndex(s => String(s.id) === String(student.id));
    if (index >= 0) {
        students[index] = student;
    } else {
        students.push(student);
    }
    saveToStorage(STORAGE_KEYS.STUDENTS, students);
};

export const deleteStudent = (studentId: string): void => {
    const students = getStudents().filter(s => String(s.id) !== String(studentId));
    saveToStorage(STORAGE_KEYS.STUDENTS, students);

    // Also delete related attendance
    const attendance = getAttendance().filter(a => String(a.studentId) !== String(studentId));
    saveToStorage(STORAGE_KEYS.ATTENDANCE, attendance);
};

// Attendance
export const getAttendance = (): AttendanceRecord[] =>
    getFromStorage<AttendanceRecord>(STORAGE_KEYS.ATTENDANCE);

export const getAttendanceByDate = (date: string): AttendanceRecord[] => {
    return getAttendance().filter(a => a.date === date);
};

export const getAttendanceByStudent = (studentId: string): AttendanceRecord[] => {
    return getAttendance().filter(a => a.studentId === studentId);
};

export const getAttendanceByStudentAndMonth = (
    studentId: string,
    year: number,
    month: number
): AttendanceRecord[] => {
    const monthStr = String(month).padStart(2, '0');
    const prefix = `${year}-${monthStr}`;
    return getAttendance().filter(
        a => a.studentId === studentId && a.date.startsWith(prefix)
    );
};

export const saveAttendance = (attendance: AttendanceRecord): void => {
    const records = getAttendance();
    const index = records.findIndex(
        a => String(a.studentId) === String(attendance.studentId) &&
            a.date === attendance.date &&
            a.lessonIndex === attendance.lessonIndex
    );
    if (index >= 0) {
        records[index] = attendance;
    } else {
        records.push(attendance);
    }
    saveToStorage(STORAGE_KEYS.ATTENDANCE, records);
};

export const deleteAttendance = (studentId: string, date: string, lessonIndex?: number): void => {
    const records = getAttendance().filter(
        a => !(String(a.studentId) === String(studentId) &&
            a.date === date &&
            (lessonIndex === undefined || a.lessonIndex === lessonIndex))
    );
    saveToStorage(STORAGE_KEYS.ATTENDANCE, records);
};

export const getBimesters = (): Bimester[] => {
    const bimesters = getFromStorage<Bimester>(STORAGE_KEYS.BIMESTERS);
    return bimesters.length > 0 ? bimesters : DEFAULT_BIMESTERS;
};

export const saveBimesters = (bimesters: Bimester[]): void => {
    saveToStorage(STORAGE_KEYS.BIMESTERS, bimesters);
};

// Statistics
export const calculateStudentStats = (
    studentId: string,
    startDate?: string,
    endDate?: string
): StudentStats => {
    let records = getAttendanceByStudent(studentId);

    if (startDate) {
        records = records.filter(r => r.date >= startDate);
    }
    if (endDate) {
        records = records.filter(r => r.date <= endDate);
    }

    const stats: AttendanceStats = {
        totalDays: records.length,
        present: records.filter(r => r.status === 'P').length,
        absent: records.filter(r => r.status === 'F').length,
        justified: records.filter(r => r.status === 'J').length,
        noClass: records.filter(r => r.status === '-').length,
        attendanceRate: 0,
    };

    const validDays = stats.totalDays - stats.noClass;
    stats.attendanceRate = validDays > 0
        ? ((stats.present + stats.justified) / validDays) * 100
        : 0;

    const student = getStudents().find(s => String(s.id) === String(studentId));

    return {
        ...stats,
        studentId,
        studentName: student?.name || 'Unknown',
    };
};

export const calculateClassStats = (
    classId: string,
    date: string
): { present: number; absent: number; justified: number; noClass: number; total: number } => {
    const students = getStudentsByClass(classId);
    const attendance = getAttendanceByDate(date);

    const stats = {
        present: 0,
        absent: 0,
        justified: 0,
        noClass: 0,
        total: students.length,
    };

    students.forEach(student => {
        const record = attendance.find(a => a.studentId === student.id);
        if (record) {
            switch (record.status) {
                case 'P': stats.present++; break;
                case 'F': stats.absent++; break;
                case 'J': stats.justified++; break;
                case '-': stats.noClass++; break;
            }
        }
    });

    return stats;
};

// Initialize with sample data if empty
export const initializeSampleData = (): void => {
    try {
        console.log('Checking if initialization is needed...');
        if (getClasses().length === 0) {
            console.log('Initializing sample data...');
            const sampleClass: Class = {
                id: '1',
                name: '1º Ano A',
                year: '2026',
                period: 'Manhã',
                lessonsPerDay: 1,
                createdAt: new Date().toISOString(),
            };
            saveClass(sampleClass);

            const sampleStudents: Student[] = [
                {
                    id: '1',
                    name: 'Ana Silva',
                    registration: '2026001',
                    classId: '1',
                    situation: 'Cursando',
                    createdAt: new Date().toISOString(),
                },
                {
                    id: '2',
                    name: 'Bruno Santos',
                    registration: '2026002',
                    classId: '1',
                    situation: 'Cursando',
                    createdAt: new Date().toISOString(),
                },
                {
                    id: '3',
                    name: 'Carla Oliveira',
                    registration: '2026003',
                    classId: '1',
                    situation: 'Cursando',
                    createdAt: new Date().toISOString(),
                },
            ];

            sampleStudents.forEach(saveStudent);
            console.log('Sample data initialized successfully.');
        } else {
            console.log('Data already exists, skipping initialization.');
        }
    } catch (error) {
        console.error('Failed to initialize sample data:', error);
    }
};
