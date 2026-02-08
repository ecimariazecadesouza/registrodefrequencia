import { API_URL } from '../config';
import type { Class, Student, AttendanceRecord, Bimester, Holiday } from '../types';

export interface CloudData {
    classes: Class[];
    students: Student[];
    attendance: AttendanceRecord[];
    bimesters: Bimester[];
    holidays: Holiday[];
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

export const saveBatchAttendanceToCloud = async (records: AttendanceRecord[]): Promise<void> => {
    try {
        if (!navigator.onLine) {
            throw new Error('Offline');
        }

        await fetch(API_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify({
                action: 'saveBatchAttendance',
                records
            }),
        });

        // With no-cors, we can't check response.ok, so we assume success if no exception
    } catch (error) {
        console.warn('Batch Attendance Sync Error (Offline?):', error);
        // Save to sync queue if failed
        const { addToSyncQueue } = await import('./storage');
        addToSyncQueue(records);
        throw error; // Re-throw so UI can inform user
    }
};

/**
 * Processes any pending records in the sync queue.
 */
export const processSyncQueue = async (): Promise<void> => {
    if (!navigator.onLine) return;

    const { getSyncQueue, clearSyncQueue } = await import('./storage');
    const queue = getSyncQueue();

    if (queue.length === 0) return;

    console.log(`Processing sync queue with ${queue.length} items...`);
    try {
        await fetch(API_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify({
                action: 'saveBatchAttendance',
                records: queue
            }),
        });
        clearSyncQueue();
        console.log('Sync queue processed successfully');
    } catch (error) {
        console.error('Failed to process sync queue:', error);
    }
};

/**
 * Utility to sync all local data to the cloud in the background.
 * Call this after major changes (adding classes, students, etc.)
 */
export const triggerCloudSync = async () => {
    const { getClasses, getStudents, getAttendance, getBimesters, getHolidays } = await import('./storage');
    if (!navigator.onLine) return;

    try {
        const data = {
            classes: getClasses(),
            students: getStudents(),
            attendance: getAttendance(),
            bimesters: getBimesters(),
            holidays: getHolidays()
        };
        await saveCloudData(data);
        console.log('Background sync successful');
    } catch (err) {
        console.error('Background sync failed:', err);
    }
};
