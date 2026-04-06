import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { resetPassword } from '../store/authSlice';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Lock, ArrowRight, Eye, EyeOff, CheckCircle, Sparkles, GraduationCap } from 'lucide-react';
import toast from 'react-hot-toast';

const ResetPassword = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { loading } = useSelector((state) => state.auth);

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            return toast.error('Passwords do not match');
        }
        if (password.length < 6) {
            return toast.error('Password must be at least 6 characters');
        }

        try {
            await dispatch(resetPassword({ resetToken: token, password })).unwrap();
            setIsSuccess(true);
            toast.success('Password reset successfully!');
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err) {
            toast.error(err.message || 'Failed to reset password.');
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
                        <h2 className="text-3xl font-black font-outfit text-white">SLAA Platform</h2>
                    </div>

                    {!isSuccess ? (
                        <>
                            <div className="mb-8">
                                <h3 className="text-2xl font-bold font-outfit text-white">Reset Password</h3>
                                <p className="text-sm text-text-dim mt-1">
                                    Please enter your new secure password below.
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-4">
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim" size={18} />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="New password"
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

                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim" size={18} />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Confirm new password"
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
                                    {loading ? 'Updating Password...' : 'Reset Password'}
                                    <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" />
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className="text-center py-4">
                            <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle size={40} className="text-success" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-3">Password Restored</h3>
                            <p className="text-text-dim text-sm leading-relaxed mb-8">
                                Your password has been successfully updated. Redirecting you to login...
                            </p>
                            <Link
                                to="/login"
                                className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:text-primary-bright uppercase tracking-widest no-underline transition-colors"
                            >
                                Take me there now
                                <ArrowRight size={14} />
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
