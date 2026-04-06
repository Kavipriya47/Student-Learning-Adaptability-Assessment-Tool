import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { changePassword } from '../store/authSlice';
import { useNavigate } from 'react-router-dom';
import { Lock, ArrowRight, Eye, EyeOff, Sparkles, GraduationCap } from 'lucide-react';
import toast from 'react-hot-toast';

const ChangePassword = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { loading, user } = useSelector((state) => state.auth);

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            return toast.error('New passwords do not match');
        }
        if (newPassword.length < 6) {
            return toast.error('New password must be at least 6 characters');
        }

        try {
            await dispatch(changePassword({ currentPassword, newPassword })).unwrap();
            toast.success('Password updated successfully!');

            // Redirect based on role
            const role = user?.role;
            if (role === 'Admin') navigate('/admin');
            else if (role === 'Mentor') navigate('/mentor');
            else if (role === 'Faculty') navigate('/faculty');
            else if (role === 'Student') navigate('/student');
            else navigate('/');
        } catch (err) {
            toast.error(err.message || 'Failed to update password.');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 relative">
            <div className="bg-mesh"></div>

            <div className="w-full max-w-md mx-auto animate-scale-in">
                <div className="glass-card p-10 border-white/10 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Sparkles size={120} />
                    </div>

                    <div className="mb-10 text-center">
                        <div className="inline-flex w-16 h-16 bg-primary rounded-2xl items-center justify-center mb-4">
                            <GraduationCap size={32} className="text-white" />
                        </div>
                        <h2 className="text-3xl font-black font-outfit text-white">Security Center</h2>
                    </div>

                    <div className="mb-8">
                        <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-2xl font-bold font-outfit text-white">Update Password</h3>
                            {user?.mustChangePassword && (
                                <span className="bg-amber-500/20 text-amber-500 text-[10px] font-black uppercase px-2 py-0.5 rounded border border-amber-500/30">Required</span>
                            )}
                        </div>
                        <p className="text-sm text-text-dim mt-1">
                            {user?.mustChangePassword
                                ? "This is your first login. For your security, you must change your default password before proceeding."
                                : "Keep your account secure by updating your password regularly."
                            }
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim" size={18} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    placeholder={user?.mustChangePassword ? "Current Password (your email)" : "Current Password"}
                                    className="w-full bg-bg-surface border border-border-subtle rounded-2xl pl-12 pr-12 py-4 text-white focus:outline-none focus:border-primary transition-all font-medium placeholder:text-text-dim/50 shadow-inner"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-text-dim hover:text-primary transition-colors focus:outline-none"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>

                            <div className="h-px bg-white/5 mx-4 my-2"></div>

                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim" size={18} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="New Password"
                                    className="w-full bg-bg-surface border border-border-subtle rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-primary transition-all font-medium placeholder:text-text-dim/50 shadow-inner"
                                    required
                                />
                            </div>

                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim" size={18} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm New Password"
                                    className="w-full bg-bg-surface border border-border-subtle rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-primary transition-all font-medium placeholder:text-text-dim/50 shadow-inner"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full btn btn-primary py-5 text-lg font-black tracking-tight group"
                        >
                            {loading ? 'Updating...' : 'Update Password'}
                            <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </form>

                    {!user?.mustChangePassword && (
                        <div className="mt-8 text-center">
                            <button
                                onClick={() => navigate(-1)}
                                className="text-xs font-bold text-text-dim hover:text-white uppercase tracking-widest no-underline transition-colors"
                            >
                                Back to Dashboard
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChangePassword;
