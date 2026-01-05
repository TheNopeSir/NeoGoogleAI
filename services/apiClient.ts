/**
 * API Client for PostgreSQL Backend
 * Replaces Supabase client calls with REST API calls
 */

const API_BASE = window.location.origin;

// Generic fetch wrapper
async function apiFetch(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });

    if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
}

// Sync all data (replaces multiple Supabase .from() calls)
export async function syncAllData() {
    return apiFetch('/api/sync');
}

// User operations
export async function updateUser(userData: any) {
    return apiFetch('/api/users/update', {
        method: 'POST',
        body: JSON.stringify(userData),
    });
}

// Generic CRUD operations
export async function createOrUpdate(table: string, data: any) {
    return apiFetch(`/api/${table}`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function deleteRecord(table: string, id: string) {
    return apiFetch(`/api/${table}/${id}`, {
        method: 'DELETE',
    });
}

// Stub auth object to replace Supabase auth
export const auth = {
    async getSession() {
        // No server-side auth for now, return null
        return { data: { session: null }, error: null };
    },
    async signUp(credentials: any) {
        // Store in localStorage for now (no server auth)
        console.warn('[Auth] Server-side auth disabled, using localStorage');
        return { data: null, error: null };
    },
    async signInWithPassword(credentials: any) {
        console.warn('[Auth] Server-side auth disabled, using localStorage');
        return { data: { user: null }, error: null };
    },
    async signOut() {
        return { error: null };
    },
};

// Stub database methods to replace Supabase .from() pattern
export function from(table: string) {
    return {
        select: (columns = '*') => ({
            eq: (column: string, value: any) => ({
                single: async () => {
                    // For now, return empty - data is handled via /api/sync
                    return { data: null, error: null };
                },
            }),
            async then(resolve: any) {
                // Return empty array for select queries
                resolve({ data: [], error: null });
            },
        }),
        upsert: async (payload: any) => {
            try {
                await createOrUpdate(table, payload);
                return { data: null, error: null };
            } catch (error: any) {
                return { data: null, error: { message: error.message } };
            }
        },
        delete: () => ({
            eq: (column: string, value: any) => ({
                async then(resolve: any) {
                    try {
                        await deleteRecord(table, value);
                        resolve({ data: null, error: null });
                    } catch (error: any) {
                        resolve({ data: null, error: { message: error.message } });
                    }
                },
            }),
        }),
    };
}
