import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { forgotPassword, verifyOtp } from '../store/authSlice';
import { ArrowLeft, Sparkles, GraduationCap, Mail, ShieldCheck, ArrowRight, Loader2, RefreshCcw } from 'lucide-react';
import toast from 'react-hot-toast';

const ForgotPassword = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    
    const [step, setStep] = useState(1); // 1: Email, 2: OTP
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSendOtp = async (e) => {
        e.preventDefault();
        if (!email) return toast.error('Please enter your email');
        
        setLoading(true);
        try {
            await dispatch(forgotPassword(email)).unwrap();
            toast.success('Verification code sent to your email');
            setStep(2);
        } catch (err) {
            if (err.message?.includes('not exist') || err.status === 404) {
                toast.error('User not found. Please contact the administrator.', { duration: 5000 });
            } else {
                toast.error(err.message || 'Failed to send code');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        if (otp.length !== 6) return toast.error('Please enter the 6-digit code');

        setLoading(true);
        try {
            const data = await dispatch(verifyOtp({ email, otp })).unwrap();
            toast.success('Code verified successfully!');
            // Redirect to reset password with the token in URL
            navigate(`/reset-password/${data.resetToken}`);
        } catch (err) {
            toast.error(err.message || 'Invalid or expired code');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 relative">
            <div className="bg-mesh"></div>

            <div className="w-full max-w-md mx-auto animate-scale-in">
                <div className="glass-card p-10 pt-20 border-white/10 shadow-2xl relative overflow-hidden">
                    <Link
                        to="/login"
                        className="absolute top-8 left-8 flex items-center gap-2 text-[10px] font-black text-text-dim hover:text-white transition-all uppercase tracking-[0.2em] no-underline group/back"
                    >
                        <ArrowLeft size={14} className="group-hover/back:-translate-x-1 transition-transform" />
                        Back to Login
                    </Link>

                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Sparkles size={120} />
                    </div>

                    <div className="mb-10 text-center">
                        <div className="inline-flex w-16 h-16 bg-primary rounded-2xl items-center justify-center mb-4">
                            <GraduationCap size={32} className="text-white" />
                        </div>
                        <h2 className="text-3xl font-black font-outfit text-white">SLAA Platform</h2>
                    </div>

                    {step === 1 ? (
                        <div className="animate-slide-up">
                            <div className="mb-8">
                                <h3 className="text-2xl font-bold font-outfit text-white">Forgot Password</h3>
                                <p className="text-sm text-text-dim mt-2 leading-relaxed">
                                    Enter your institutional email to receive a secure 6-digit verification code.
                                </p>
                            </div>

                            <form onSubmit={handleSendOtp} className="space-y-6">
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim" size={18} />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="yourname@email.com"
                                        className="w-full bg-bg-surface border border-border-subtle rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-primary transition-all font-medium placeholder:text-text-dim/50 shadow-inner"
                                        required
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full btn btn-primary py-5 text-lg font-black tracking-tight group"
                                >
                                    {loading ? <Loader2 className="animate-spin" /> : 'Request Code'}
                                    <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" />
                                </button>
                            </form>
                        </div>
                    ) : (
                        <div className="animate-slide-up">
                            <div className="mb-8">
                                <div className="w-16 h-16 bg-success/10 rounded-2xl flex items-center justify-center mb-6">
                                    <ShieldCheck size={32} className="text-success" />
                                </div>
                                <h3 className="text-2xl font-bold font-outfit text-white">Verify Identity</h3>
                                <p className="text-sm text-text-dim mt-2 leading-relaxed">
                                    We've sent a 6-digit code to <span className="text-white font-bold">{email}</span>. 
                                    It expires in 10 minutes.
                                </p>
                            </div>

                            <form onSubmit={handleVerifyOtp} className="space-y-6">
                                <div className="relative">
                                    <input
                                        type="text"
                                        maxLength="6"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                        placeholder="0 0 0 0 0 0"
                                        className="w-full bg-bg-surface border border-border-subtle rounded-2xl p-5 text-center text-3xl font-black tracking-[0.5em] text-primary focus:outline-none focus:border-primary transition-all placeholder:text-text-dim/20 shadow-inner"
                                        required
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full btn btn-primary py-5 text-lg font-black tracking-tight group"
                                >
                                    {loading ? <Loader2 className="animate-spin" /> : 'Verify Code'}
                                    <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" />
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="w-full flex items-center justify-center gap-2 text-xs font-bold text-text-dim hover:text-white transition-colors uppercase tracking-widest"
                                >
                                    <RefreshCcw size={14} />
                                    Change Email or Resend
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
