export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Debug logging - remove this later
console.log('🔍 API_BASE_URL:', API_BASE_URL);
console.log('🔍 NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);
console.log('🔍 Build timestamp:', new Date().toISOString());
