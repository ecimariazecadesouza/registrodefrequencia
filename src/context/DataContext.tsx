import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Class, Student, AttendanceRecord, Bimester } from '../types';
import {
    getClasses as fetchClasses,
    getStudents as fetchStudents,
    getAttendance as fetchAttendance,
    getBimesters as fetchBimesters,
    saveToStorage,
    STORAGE_KEYS
} from '../utils/storage';

interface DataContextType {
    classes: Class[];
    students: Student[];
    attendance: AttendanceRecord[];
    bimesters: Bimester[];
    refreshData: () => void;
    hydrateFromCloud: (data: {
        classes: Class[];
        students: Student[];
        attendance: AttendanceRecord[];
        bimesters: Bimester[];
    }) => void;
    isLoading: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [classes, setClasses] = useState<Class[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [bimesters, setBimesters] = useState<Bimester[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const refreshData = useCallback(() => {
        setClasses(fetchClasses());
        setStudents(fetchStudents());
        setAttendance(fetchAttendance());
        setBimesters(fetchBimesters());
        setIsLoading(false);
    }, []);

    const hydrateFromCloud = useCallback((data: any) => {
        if (data.classes) {
            saveToStorage(STORAGE_KEYS.CLASSES, data.classes);
            setClasses(data.classes);
        }
        if (data.students) {
            saveToStorage(STORAGE_KEYS.STUDENTS, data.students);
            setStudents(data.students);
        }
        if (data.attendance) {
            saveToStorage(STORAGE_KEYS.ATTENDANCE, data.attendance);
            setAttendance(data.attendance);
        }
        if (data.bimesters) {
            saveToStorage(STORAGE_KEYS.BIMESTERS, data.bimesters);
            setBimesters(data.bimesters);
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
