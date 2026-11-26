const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export async function testBackendConnection() {
    const response = await fetch(`${API_URL}/api/test`);

    if (!response.ok) {
        throw new Error("Failed to connect to backend");
    }

    return response.json();
}
