import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Class, Student, AttendanceRecord, Bimester, Holiday } from '../types';
import {
    getClasses as fetchClasses,
    getStudents as fetchStudents,
    getAttendance as fetchAttendance,
    getBimesters as fetchBimesters,
    getHolidays as fetchHolidays,
    saveToStorage,
    STORAGE_KEYS
} from '../utils/storage';

interface DataContextType {
    classes: Class[];
    students: Student[];
    attendance: AttendanceRecord[];
    bimesters: Bimester[];
    holidays: Holiday[];
    refreshData: () => void;
    hydrateFromCloud: (data: {
        classes: Class[];
        students: Student[];
        attendance: AttendanceRecord[];
        bimesters: Bimester[];
        holidays: Holiday[];
    }) => void;
    isLoading: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [classes, setClasses] = useState<Class[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [bimesters, setBimesters] = useState<Bimester[]>([]);
    const [holidays, setHolidays] = useState<Holiday[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const refreshData = useCallback(() => {
        const sortedClasses = fetchClasses().sort((a, b) => a.name.localeCompare(b.name));
        const sortedStudents = fetchStudents().sort((a, b) => a.name.localeCompare(b.name));

        setClasses(sortedClasses);
        setStudents(sortedStudents);
        setAttendance(fetchAttendance());
        setBimesters(fetchBimesters());
        setHolidays(fetchHolidays());
        setIsLoading(false);
    }, []);

    const hydrateFromCloud = useCallback((data: any) => {
        if (data.classes) {
            const sortedClasses = [...data.classes].sort((a, b) => a.name.localeCompare(b.name));
            saveToStorage(STORAGE_KEYS.CLASSES, sortedClasses);
            setClasses(sortedClasses);
        }
        if (data.students) {
            const sortedStudents = [...data.students].sort((a, b) => a.name.localeCompare(b.name));
            saveToStorage(STORAGE_KEYS.STUDENTS, sortedStudents);
            setStudents(sortedStudents);
        }
        if (data.attendance) {
            // Normaliza datas ISO para formato curto
            const normalizedAttendance = data.attendance.map((r: AttendanceRecord) => ({
                ...r,
                date: r.date.substring(0, 10)
            }));
            saveToStorage(STORAGE_KEYS.ATTENDANCE, normalizedAttendance);
            setAttendance(normalizedAttendance);
        }
        if (data.bimesters) {
            saveToStorage(STORAGE_KEYS.BIMESTERS, data.bimesters);
            setBimesters(data.bimesters);
        }
        if (data.holidays) {
            saveToStorage(STORAGE_KEYS.HOLIDAYS, data.holidays);
            setHolidays(data.holidays);
        }
    }, []);

    useEffect(() => {
        refreshData();
    }, [refreshData]);

    return (
        <DataContext.Provider value={{
            classes,
            students,
            attendance,
            bimesters,
            holidays,
            refreshData,
            hydrateFromCloud,
            isLoading
        }}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};
