import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser, fetchCurrentUser } from '../store/authSlice';
import { useNavigate, Link } from 'react-router-dom';
import { GraduationCap, ArrowRight, ShieldCheck, Mail, Sparkles, User, AlertCircle, Eye, EyeOff, Lock } from 'lucide-react';
import './Login.css';

const Activity = ({ size, className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
    </svg>
);

const Shield = ({ size, className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
    </svg>
);

const Login = () => {
    const [authError, setAuthError] = useState(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const { loading } = useSelector((state) => state.auth);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { user } = useSelector((state) => state.auth);

    const handleManualLogin = async (e) => {
        if (e) e.preventDefault();
        setAuthError(null);
        try {
            await dispatch(loginUser({ email, password })).unwrap();
        } catch (err) {
            setAuthError(err.message || 'Login failed. Please check your credentials.');
        }
    };

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const tokenFromUrl = urlParams.get('token');
        const refreshTokenFromUrl = urlParams.get('refreshToken');
        const errorCode = urlParams.get('error');

        if (errorCode === 'unauthorized') {
            setAuthError('Your email is not registered in the system. Please contact the administrator.');
        } else if (errorCode) {
            setAuthError('Authentication failed. Please try again.');
        }

        if (tokenFromUrl) {
            localStorage.setItem('token', tokenFromUrl);
            if (refreshTokenFromUrl) {
                localStorage.setItem('refreshToken', refreshTokenFromUrl);
            }
            dispatch(fetchCurrentUser());
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, [dispatch]);

    useEffect(() => {
        if (user) {
            if (user.mustChangePassword) {
                navigate('/change-password');
                return;
            }
            const role = user.role;
            if (role === 'Admin') navigate('/admin');
            else if (role === 'Mentor') navigate('/mentor');
            else if (role === 'Faculty') navigate('/faculty');
            else if (role === 'Student') navigate('/student');
        }
    }, [user, navigate]);


    return (
        <div className="min-h-screen flex items-center justify-center p-6 relative">
            <div className="bg-mesh"></div>

            <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div className="hidden lg:block animate-slide-up">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-glow">
                            <GraduationCap className="text-white" size={28} />
                        </div>
                        <h2 className="text-3xl font-black font-outfit text-white tracking-tighter">SLAA</h2>
                    </div>
                    <h1 className="text-6xl font-black font-outfit text-white leading-[1.1] mb-6">
                        Unlock the <span className="text-primary italic">Potential</span> of Every Student.
                    </h1>
                    <p className="text-xl text-text-muted leading-relaxed max-w-lg mb-12">
                        Advanced analytics and adaptability tracking for the next generation of academic excellence.
                    </p>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="glass-card p-6 border-white/5">
                            <Activity className="text-secondary mb-4" size={32} />
                            <h4 className="text-white font-bold mb-1">Real-time Tracking</h4>
                            <p className="text-xs text-text-dim">Adaptive scoring based on live performance data.</p>
                        </div>
                        <div className="glass-card p-6 border-white/5">
                            <Shield className="text-accent mb-4" size={32} />
                            <h4 className="text-white font-bold mb-1">Strategic Insights</h4>
                            <p className="text-xs text-text-dim">Mentorship-driven intervention protocols.</p>
                        </div>
                    </div>
                </div>

                <div className="w-full max-w-md mx-auto animate-scale-in">
                    <div className="glass-card p-10 border-white/10 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Sparkles size={120} />
                        </div>

                        <div className="mb-10 lg:hidden text-center">
                            <div className="inline-flex w-16 h-16 bg-primary rounded-2xl items-center justify-center mb-4">
                                <GraduationCap size={32} className="text-white" />
                            </div>
                            <h2 className="text-3xl font-black font-outfit text-white">SLAA Platform</h2>
                        </div>

                        <div className="mb-8">
                            <h3 className="text-2xl font-bold font-outfit text-white">Welcome Back</h3>
                            <p className="text-sm text-text-dim mt-1">Authenticate to access institutional analytics.</p>
                        </div>

                        {authError && (
                            <div className="login-error-container mb-6 animate-shake">
                                <div className="login-error-content flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                                    <AlertCircle size={18} className="text-red-400 mt-0.5 flex-shrink-0" />
                                    <p className="text-xs text-red-400 font-bold leading-relaxed">
                                        {authError}
                                    </p>
                                </div>
                            </div>
                        )}

                        <a
                            href={`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/auth/google`}
                            className="w-full btn btn-outline py-4 flex items-center justify-center gap-4 mb-8 border-border-bright/30 hover:bg-white/5 transition-all no-underline"
                        >
                            <Mail size={20} className="text-primary" />
                            <span className="font-bold text-white text-sm">Sign in with Google</span>
                        </a>

                        <div className="relative my-8">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border-subtle/30"></div></div>
                            <div className="relative flex justify-center text-[10px] uppercase font-black"><span className="bg-bg-surface px-4 text-text-dim tracking-[0.3em]">Or Direct Access</span></div>
                        </div>

                        <form onSubmit={handleManualLogin} className="space-y-6">
                            <div className="space-y-4">
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim" size={18} />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="Enter registered email"
                                        className="w-full bg-bg-surface border border-border-subtle rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-primary transition-all font-medium placeholder:text-text-dim/50 shadow-inner"
                                        required
                                    />
                                </div>

                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim" size={18} />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Enter password"
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
                            </div>

                            <div className="flex justify-end">
                                <Link
                                    to="/forgot-password"
                                    className="text-[11px] font-bold text-primary hover:text-primary-bright uppercase tracking-wider no-underline transition-colors"
                                >
                                    Forgot Password?
                                </Link>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full btn btn-primary py-5 text-lg font-black tracking-tight group"
                            >
                                {loading ? 'Validating Access...' : 'Continue to Dashboard'}
                                <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        </form>

                        <div className="mt-10 flex items-center justify-center gap-2 text-text-dim">
                            <ShieldCheck size={14} className="text-success" />
                            <span className="text-[10px] font-bold uppercase tracking-[0.15em]">Military Grade Security</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
