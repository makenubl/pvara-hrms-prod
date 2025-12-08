import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Users, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  Shield, 
  Zap,
  CheckCircle,
  ArrowRight,
  Star,
  Play,
  Menu,
  X,
  Clock,
  BarChart3,
  GraduationCap,
  FileCheck,
  UserPlus,
  Globe,
  Headphones,
  Award
} from 'lucide-react';
import { Button } from '../components/UI';
import brandLogo from '../logo.svg';

const LandingPage = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const features = [
    {
      icon: <Users className="w-8 h-8" />,
      title: 'Employee Management',
      description: 'Centralize all employee data, documents, and records in one secure platform. Easy onboarding and offboarding workflows.',
      color: 'bg-blue-500',
    },
    {
      icon: <Clock className="w-8 h-8" />,
      title: 'Attendance & Time Tracking',
      description: 'Track work hours, manage shifts, and monitor attendance with GPS and biometric integrations.',
      color: 'bg-green-500',
    },
    {
      icon: <Calendar className="w-8 h-8" />,
      title: 'Leave Management',
      description: 'Streamline leave requests, approvals, and balance tracking. Custom leave policies for your organization.',
      color: 'bg-purple-500',
    },
    {
      icon: <DollarSign className="w-8 h-8" />,
      title: 'Payroll Processing',
      description: 'Automate salary calculations, tax deductions, and generate payslips. Multi-currency support included.',
      color: 'bg-yellow-500',
    },
    {
      icon: <TrendingUp className="w-8 h-8" />,
      title: 'Performance Management',
      description: 'Set goals, conduct reviews, and track employee growth with 360-degree feedback systems.',
      color: 'bg-red-500',
    },
    {
      icon: <UserPlus className="w-8 h-8" />,
      title: 'Recruitment & ATS',
      description: 'Post jobs, track applicants, and manage the entire hiring pipeline from one dashboard.',
      color: 'bg-indigo-500',
    },
    {
      icon: <GraduationCap className="w-8 h-8" />,
      title: 'Learning & Development',
      description: 'Create training programs, assign courses, and track employee skill development.',
      color: 'bg-pink-500',
    },
    {
      icon: <BarChart3 className="w-8 h-8" />,
      title: 'Analytics & Reports',
      description: 'Get actionable insights with customizable dashboards and automated reports.',
      color: 'bg-cyan-500',
    },
  ];

  const testimonials = [
    {
      name: 'Sarah Johnson',
      role: 'HR Director',
      company: 'TechCorp Inc.',
      quote: 'PVARA transformed how we manage our 500+ employees. The automation saved us 20 hours per week on administrative tasks.',
      rating: 5,
    },
    {
      name: 'Michael Chen',
      role: 'CEO',
      company: 'StartupFlow',
      quote: 'The best investment we made for our growing team. Onboarding is now seamless and our employees love the self-service portal.',
      rating: 5,
    },
    {
      name: 'Emily Rodriguez',
      role: 'Operations Manager',
      company: 'Global Services Ltd.',
      quote: 'Multi-location support and real-time analytics helped us scale from 50 to 300 employees without adding HR staff.',
      rating: 5,
    },
  ];

  const stats = [
    { value: '10,000+', label: 'Companies Trust Us' },
    { value: '2M+', label: 'Employees Managed' },
    { value: '99.9%', label: 'Uptime Guaranteed' },
    { value: '150+', label: 'Countries Supported' },
  ];

  const benefits = [
    { icon: <Shield className="w-6 h-6" />, title: 'Enterprise Security', description: 'SOC 2 Type II certified with end-to-end encryption' },
    { icon: <Globe className="w-6 h-6" />, title: 'Global Compliance', description: 'Stay compliant with labor laws worldwide' },
    { icon: <Headphones className="w-6 h-6" />, title: '24/7 Support', description: 'Dedicated support team ready to help anytime' },
    { icon: <Zap className="w-6 h-6" />, title: 'Quick Setup', description: 'Get started in minutes, not weeks' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 overflow-hidden">
      {/* Animated Background Elements - Elegant Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-400/12 rounded-full blur-[120px] opacity-60"></div>
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-400/10 rounded-full blur-[120px] opacity-50" style={{animation: 'pulse 5s cubic-bezier(0.4, 0, 0.6, 1) infinite', animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 right-1/3 w-[500px] h-[500px] bg-cyan-300/8 rounded-full blur-[120px] opacity-40" style={{animation: 'pulse 6s cubic-bezier(0.4, 0, 0.6, 1) infinite', animationDelay: '0.5s'}}></div>
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-white/40 backdrop-blur-2xl z-50 border-b border-white/40 shadow-sm shadow-blue-200/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <img src={brandLogo} alt="PVARA" className="w-10 h-10 rounded-xl shadow-xl shadow-blue-400/30 hover:shadow-blue-400/50 transition-shadow duration-300 bg-white/80 p-1" />
              <span className="text-2xl font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 bg-clip-text text-transparent tracking-tight">PVARA</span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-slate-600 hover:text-slate-900 transition-colors duration-300 font-semibold text-sm">Features</a>
              <a href="#testimonials" className="text-slate-600 hover:text-slate-900 transition-colors duration-300 font-semibold text-sm">Testimonials</a>
              <a href="#pricing" className="text-slate-600 hover:text-slate-900 transition-colors duration-300 font-semibold text-sm">Pricing</a>
              <Link to="/login" className="text-slate-600 hover:text-slate-900 transition-colors duration-300 font-semibold text-sm">Login</Link>
              <Button onClick={() => navigate('/pricing')} className="shadow-xl shadow-blue-400/40 hover:shadow-blue-400/60 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white border-0 font-bold transition-all duration-300">
                Start Free Trial
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-gray-100">
              <div className="flex flex-col gap-4">
                <a href="#features" className="text-gray-600 hover:text-gray-900">Features</a>
                <a href="#testimonials" className="text-gray-600 hover:text-gray-900">Testimonials</a>
                <a href="#pricing" className="text-gray-600 hover:text-gray-900">Pricing</a>
                <Link to="/login" className="text-gray-600 hover:text-gray-900">Login</Link>
                <Button onClick={() => navigate('/pricing')} className="w-full justify-center">
                  Start Free Trial
                </Button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/60 backdrop-blur-xl border border-blue-200/40 text-blue-600 px-4 py-2 rounded-full text-sm font-bold mb-6 hover:bg-white/80 transition-all duration-300">
                <Zap className="w-4 h-4" />
                #1 Rated HR Platform for Growing Businesses
              </div>
              <h1 className="text-5xl lg:text-7xl font-black text-slate-900 leading-tight mb-6 tracking-tight">
                Manage Your
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600"> Workforce </span>
                With Ease
              </h1>
              <p className="text-xl text-slate-600 mb-8 leading-relaxed font-medium">
                The all-in-one HR platform that simplifies employee management, automates payroll, 
                and helps you build a better workplace. Trusted by 10,000+ companies worldwide.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg" 
                  onClick={() => navigate('/pricing')}
                  className="shadow-xl shadow-blue-400/40 hover:shadow-blue-400/60 text-lg px-8 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white border-0 transition-all duration-300 font-bold"
                >
                  Start 14-Day Free Trial
                  <ArrowRight className="w-5 h-5" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="lg"
                  className="text-lg text-slate-900 border-2 border-slate-300 hover:border-slate-400 hover:bg-slate-100/50 transition-all duration-300 font-bold"
                  onClick={() => window.alert('Demo video coming soon!')}
                >
                  <Play className="w-5 h-5" />
                  Watch Demo
                </Button>
              </div>
              <div className="flex items-center gap-6 mt-8 pt-8 border-t border-slate-200">
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="w-10 h-10 rounded-full border-2 border-white/30 bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white font-semibold text-xs shadow-lg"
                    >
                      U{i}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm text-slate-500 font-semibold">From 2,000+ reviews</p>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-blue-300/30 to-indigo-400/30 rounded-2xl p-1 backdrop-blur-xl border border-white/60 shadow-2xl shadow-blue-300/20">
                <div className="bg-white/60 rounded-xl overflow-hidden shadow-2xl backdrop-blur-sm">
                  <div className="w-full h-96 bg-gradient-to-br from-white/40 to-indigo-100/40 flex items-center justify-center">
                    <div className="text-center">
                      <BarChart3 className="w-20 h-20 text-indigo-600 mx-auto mb-4" />
                      <p className="text-slate-700 font-bold text-lg">Dashboard Preview</p>
                    </div>
                  </div>
                </div>
              </div>
              {/* Floating Cards */}
              <div className="absolute -left-8 top-1/4 bg-white rounded-xl shadow-xl p-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Leave Approved</p>
                    <p className="text-sm text-gray-500">Just now</p>
                  </div>
                </div>
              </div>
              <div className="absolute -right-4 bottom-1/4 bg-white rounded-xl shadow-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">+24 New Hires</p>
                    <p className="text-sm text-gray-500">This month</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white/50 backdrop-blur-xl border-y border-white/60 relative z-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center group hover:scale-105 transition-transform duration-300">
                <p className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 mb-2 group-hover:scale-110 transition-transform">{stat.value}</p>
                <p className="text-slate-600 group-hover:text-slate-800 transition-colors font-bold">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-white/60 backdrop-blur-xl border border-blue-200/40 text-blue-600 px-4 py-2 rounded-full text-sm font-bold mb-4 hover:bg-white/80 transition-all duration-300">
              <Award className="w-4 h-4" />
              Powerful Features
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">
              Everything You Need to Manage HR
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto font-medium">
              From hiring to retiring, our comprehensive suite of tools helps you manage 
              every aspect of your workforce efficiently.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="group bg-white/70 backdrop-blur-xl rounded-2xl p-6 border border-white/80 hover:border-blue-300/60 hover:bg-white/90 transition-all duration-300 cursor-pointer hover:shadow-xl hover:shadow-blue-300/20"
              >
                <div className={`w-14 h-14 ${feature.color} rounded-xl flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform duration-300 shadow-xl shadow-blue-300/30`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-slate-600 font-medium">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-blue-200/40 to-indigo-200/40 backdrop-blur-xl border-y border-white/60 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight">
                Why Choose PVARA?
              </h2>
              <p className="text-xl text-slate-700 mb-8 font-medium">
                We're more than just software. We're your partner in building a 
                thriving workplace culture.
              </p>
              <div className="grid sm:grid-cols-2 gap-6">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex gap-4 group hover:scale-105 transition-transform duration-300">
                    <div className="w-12 h-12 bg-white/70 backdrop-blur-xl border border-blue-200/40 rounded-lg flex items-center justify-center text-indigo-600 flex-shrink-0 group-hover:bg-white transition-all duration-300 group-hover:shadow-lg group-hover:shadow-blue-300/30 font-bold">
                      {benefit.icon}
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900">{benefit.title}</h3>
                      <p className="text-slate-600 text-sm font-medium">{benefit.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="w-full h-80 bg-gradient-to-br from-white/70 to-indigo-100/70 rounded-2xl flex items-center justify-center shadow-2xl border border-white/80 backdrop-blur-xl">
                <div className="text-center">
                  <Users className="w-20 h-20 text-indigo-600 mx-auto mb-4" />
                  <p className="text-slate-700 font-bold text-lg">Team Collaboration</p>
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-blue-400/10 to-transparent rounded-2xl"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 px-4 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-white/60 backdrop-blur-xl border border-green-200/40 text-green-600 px-4 py-2 rounded-full text-sm font-bold mb-4 hover:bg-white/80 transition-all duration-300">
              <Star className="w-4 h-4" />
              Customer Stories
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">
              Loved by HR Teams Worldwide
            </h2>
            <p className="text-xl text-slate-600 font-medium">
              See what our customers have to say about their experience with PVARA.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div 
                key={index}
                className="bg-white/70 backdrop-blur-xl rounded-2xl p-8 border border-white/80 hover:border-blue-300/60 hover:bg-white/90 transition-all duration-300 group hover:shadow-xl hover:shadow-blue-300/20"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-slate-700 mb-6 italic font-medium">"{testimonial.quote}"</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-blue-400/40">
                    {testimonial.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-black text-slate-900">{testimonial.name}</p>
                    <p className="text-sm text-slate-600 font-semibold">{testimonial.role} at {testimonial.company}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="pricing" className="py-20 px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight">
            Ready to Transform Your HR?
          </h2>
            <p className="text-xl text-slate-600 mb-8 font-medium">
            Join 10,000+ companies already using PVARA to manage their workforce. 
            Start your free 14-day trial today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={() => navigate('/pricing')}
              className="shadow-xl shadow-blue-400/40 hover:shadow-blue-400/60 text-lg px-8 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white border-0 transition-all duration-300 font-bold"
            >
              View Pricing Plans
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button 
              variant="secondary" 
              size="lg"
              onClick={() => navigate('/login')}
              className="text-lg px-8 bg-white/70 backdrop-blur-xl border-2 border-slate-300 text-slate-900 hover:bg-white/90 transition-all duration-300 font-bold"
            >
              Sign In
            </Button>
          </div>
          <p className="text-sm text-slate-500 mt-6 font-semibold">
            No credit card required • 14-day free trial • Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white/50 backdrop-blur-xl border-t border-white/60 text-slate-700 py-16 px-4 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-white/80 rounded-xl flex items-center justify-center shadow-lg shadow-blue-400/30 p-1">
                  <img src={brandLogo} alt="PVARA" className="w-8 h-8" />
                </div>
                <span className="text-xl font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 bg-clip-text text-transparent">PVARA</span>
              </div>
              <p className="text-slate-600 font-medium">
                The modern HR platform for growing businesses. Simplify your workforce management today.
              </p>
            </div>
            <div>
              <h4 className="font-black text-slate-900 mb-4">Product</h4>
              <ul className="space-y-2 text-slate-600">
                <li><a href="#features" className="hover:text-slate-900 transition-colors font-semibold">Features</a></li>
                <li><a href="#pricing" className="hover:text-slate-900 transition-colors font-semibold">Pricing</a></li>
                <li><a href="#" className="hover:text-slate-900 transition-colors font-semibold">Integrations</a></li>
                <li><a href="#" className="hover:text-slate-900 transition-colors font-semibold">API</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-black text-slate-900 mb-4">Company</h4>
              <ul className="space-y-2 text-slate-600">
                <li><a href="#" className="hover:text-slate-900 transition-colors font-semibold">About</a></li>
                <li><a href="#" className="hover:text-slate-900 transition-colors font-semibold">Blog</a></li>
                <li><a href="#" className="hover:text-slate-900 transition-colors font-semibold">Careers</a></li>
                <li><a href="#" className="hover:text-slate-900 transition-colors font-semibold">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-black text-slate-900 mb-4">Legal</h4>
              <ul className="space-y-2 text-slate-600">
                <li><a href="#" className="hover:text-slate-900 transition-colors font-semibold">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-slate-900 transition-colors font-semibold">Terms of Service</a></li>
                <li><a href="#" className="hover:text-slate-900 transition-colors font-semibold">Cookie Policy</a></li>
                <li><a href="#" className="hover:text-slate-900 transition-colors font-semibold">GDPR</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/60 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-slate-500 text-sm font-semibold">
              © 2025 PVARA. All rights reserved.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-slate-600 hover:text-slate-900 transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
              </a>
              <a href="#" className="text-slate-600 hover:text-slate-900 transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              </a>
              <a href="#" className="text-slate-600 hover:text-slate-900 transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
