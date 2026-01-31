import { API_URL } from '../config';
import type { Class, Student, AttendanceRecord, Bimester } from '../types';

export interface CloudData {
    classes: Class[];
    students: Student[];
    attendance: AttendanceRecord[];
    bimesters: Bimester[];
}

export const fetchCloudData = async (): Promise<CloudData> => {
    const response = await fetch(`${API_URL}?action=getData`);
    if (!response.ok) {
        throw new Error('Falha ao buscar dados da nuvem');
    }
    return response.json();
};

export const saveCloudData = async (data: CloudData): Promise<void> => {
    try {
        await fetch(API_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify({
                action: 'saveAll',
                ...data
            }),
        });
    } catch (error) {
        console.error('Data Sync Error:', error);
        throw error;
    }
};

export const saveAttendanceToCloud = async (record: AttendanceRecord): Promise<void> => {
    try {
        await fetch(API_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify({
                action: 'saveAttendance',
                record
            }),
        });
    } catch (error) {
        console.error('Attendance Sync Error:', error);
    }
};

/**
 * Utility to sync all local data to the cloud in the background.
 * Call this after major changes (adding classes, students, etc.)
 */
export const triggerCloudSync = async () => {
    const { getClasses, getStudents, getAttendance, getBimesters } = await import('./storage');
    try {
        const data = {
            classes: getClasses(),
            students: getStudents(),
            attendance: getAttendance(),
            bimesters: getBimesters()
        };
        await saveCloudData(data);
        console.log('Background sync successful');
    } catch (err) {
        console.error('Background sync failed:', err);
    }
};
