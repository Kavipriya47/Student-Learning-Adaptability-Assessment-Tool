import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../api';

export const loginUser = createAsyncThunk('auth/login', async ({ email, password }, { rejectWithValue }) => {
    try {
        const response = await api.post('/auth/login', { email, password });
        const { user, token, refreshToken } = response.data;
        localStorage.setItem('token', token);
        localStorage.setItem('refreshToken', refreshToken);
        return { user, token, refreshToken };
    } catch (error) {
        return rejectWithValue(error.response?.data || { message: error.message || 'Connection failed' });
    }
});

export const fetchCurrentUser = createAsyncThunk('auth/fetchUser', async (_, { rejectWithValue }) => {
    try {
        const response = await api.get('/auth/user');
        return response.data;
    } catch (error) {
        return rejectWithValue(error.response?.data || { message: error.message || 'Connection failed' });
    }
});

export const forgotPassword = createAsyncThunk('auth/forgotPassword', async (email, { rejectWithValue }) => {
    try {
        const response = await api.post('/auth/forgot-password', { email });
        return response.data;
    } catch (error) {
        return rejectWithValue(error.response?.data || { message: error.message || 'Failed to send reset code' });
    }
});

export const verifyOtp = createAsyncThunk('auth/verifyOtp', async ({ email, otp }, { rejectWithValue }) => {
    try {
        const response = await api.post('/auth/verify-otp', { email, otp });
        return response.data; // returns { resetToken, message }
    } catch (error) {
        return rejectWithValue(error.response?.data || { message: error.message || 'Verification failed' });
    }
});

export const resetPassword = createAsyncThunk('auth/resetPassword', async ({ resetToken, password }, { rejectWithValue }) => {
    try {
        const response = await api.post('/auth/reset-password', { resetToken, password });
        return response.data;
    } catch (error) {
        return rejectWithValue(error.response?.data || { message: error.message || 'Failed to reset password' });
    }
});

export const changePassword = createAsyncThunk('auth/changePassword', async (passwords, { rejectWithValue }) => {
    try {
        const response = await api.post('/auth/change-password', passwords);
        return response.data;
    } catch (error) {
        return rejectWithValue(error.response?.data || { message: error.message || 'Failed to change password' });
    }
});

const authSlice = createSlice({
    name: 'auth',
    initialState: {
        user: null,
        token: localStorage.getItem('token'),
        refreshToken: localStorage.getItem('refreshToken'),
        loading: false,
        error: null,
    },
    reducers: {
        logout: (state) => {
            state.user = null;
            state.token = null;
            state.refreshToken = null;
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            window.location.href = '/login';
        },
        clearError: (state) => {
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(loginUser.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(loginUser.fulfilled, (state, action) => {
                state.loading = false;
                state.user = action.payload.user;
                state.token = action.payload.token;
                state.refreshToken = action.payload.refreshToken;
            })
            .addCase(loginUser.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload?.message || 'Login failed';
            })
            .addCase(fetchCurrentUser.fulfilled, (state, action) => {
                state.user = action.payload;
            });
    },
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;

