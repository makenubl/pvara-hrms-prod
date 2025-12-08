import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { Button, Input } from '../components/UI';
import { validateEmail } from '../utils/validation';
import pvaraLogo from '../pvara-logo.png';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!validateEmail(formData.email)) newErrors.email = 'Invalid email';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validate();
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const result = await login(formData.email, formData.password);
      if (result.success) {
        navigate('/dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated gradient orbs background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full opacity-20 blur-3xl animate-float"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full opacity-20 blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500 rounded-full opacity-10 blur-3xl animate-pulse"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo Section */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="inline-flex items-center justify-center w-24 h-24 mb-6 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-2xl opacity-30 blur-lg animate-glow"></div>
            <div className="relative bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 rounded-2xl p-1 flex items-center justify-center">
              <div className="bg-slate-900 rounded-xl p-2">
                <img src={pvaraLogo} alt="PVARA" className="w-16 h-16 object-contain" />
              </div>
            </div>
          </div>
          <h1 className="text-4xl font-black bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
            PVARA
          </h1>
          <p className="text-slate-300 text-sm font-medium tracking-wide">
            Enterprise HRMS Platform
          </p>
        </div>

        {/* Glass Card Form */}
        <div className="relative group">
          {/* Glow background */}
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 rounded-3xl opacity-0 group-hover:opacity-20 blur-xl transition-all duration-500"></div>
          
          {/* Glass morphism card */}
          <div className="relative backdrop-blur-2xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-1">Welcome Back</h2>
            <p className="text-slate-300 text-sm mb-8">Sign in to access your HRMS</p>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Input */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-200">
                  Email Address
                </label>
                <div className="relative group/input">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-400 w-5 h-5" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="ayesha@pvara.com"
                    className={`w-full pl-12 pr-4 py-3 bg-white/10 backdrop-blur-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent text-white placeholder-slate-400 transition-all ${
                      errors.email ? 'border-red-500' : 'border-white/20'
                    }`}
                    required
                  />
                </div>
                {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email}</p>}
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-200">
                  Password
                </label>
                <div className="relative group/input">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-400 w-5 h-5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className={`w-full pl-12 pr-12 py-3 bg-white/10 backdrop-blur-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent text-white placeholder-slate-400 transition-all ${
                      errors.password ? 'border-red-500' : 'border-white/20'
                    }`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-cyan-400 transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password}</p>}
              </div>

              {/* Demo Credentials Alert */}
              <div className="relative overflow-hidden rounded-xl p-4 backdrop-blur-sm bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-400/30">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-orange-500 opacity-0 group-hover:opacity-10 transition-opacity"></div>
                <p className="text-xs font-semibold text-amber-100 mb-2 relative z-10">Demo Credentials</p>
                <p className="text-xs text-amber-200/80 relative z-10">Email: <span className="font-mono">demo@pvara.com</span></p>
                <p className="text-xs text-amber-200/80 relative z-10">Password: <span className="font-mono">demo123</span></p>
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full relative group/btn overflow-hidden rounded-xl py-3 px-6 font-semibold text-white transition-all duration-300"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 group-hover/btn:opacity-90 opacity-100 transition-opacity"></div>
                <div className="absolute inset-0 opacity-0 group-hover/btn:opacity-100 bg-white/20 transition-opacity blur-xl"></div>
                <div className="relative flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                    </>
                  )}
                </div>
              </button>
            </form>

            {/* Footer Links */}
            <div className="mt-8 pt-8 border-t border-white/10 space-y-3 text-center">
              <a href="#" className="block text-sm text-slate-300 hover:text-cyan-400 transition-colors font-medium">
                Forgot password?
              </a>
              <p className="text-xs text-slate-400">
                Don't have an account?{' '}
                <a href="/register" className="text-cyan-400 hover:text-cyan-300 transition-colors font-semibold">
                  Contact admin
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Floating elements for extra flair */}
        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-400">
          <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></div>
          <span>Enterprise-grade security</span>
          <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
        </div>
      </div>
    </div>
  );
};

export default Login;
