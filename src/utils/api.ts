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
    await fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors', // Apps Script requires no-cors or specialized handling for POST from different origins
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            action: 'saveAll',
            ...data
        }),
    });

    // Note: With 'no-cors', we won't be able to read the response body or status easily.
    // However, the request will be sent to the server.
};

export const saveAttendanceToCloud = async (record: AttendanceRecord): Promise<void> => {
    await fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            action: 'saveAttendance',
            record
        }),
    });
};
