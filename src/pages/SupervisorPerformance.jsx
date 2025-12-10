import React, { useState, useEffect } from 'react';
import { 
  Plus, Users, Target, Award, Calendar, Filter, Search,
  Eye, Edit, Trash2, CheckCircle, AlertCircle, TrendingUp, X
} from 'lucide-react';
import MainLayout from '../layouts/MainLayout';
import { Card, Button, Badge, Input } from '../components/UI';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import api from '../services/api';

const SupervisorPerformance = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('goals');
  const [employees, setEmployees] = useState([]);
  const [goals, setGoals] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingGoal, setEditingGoal] = useState(null);

  // Goal form state
  const [goalForm, setGoalForm] = useState({
    employee: '',
    title: '',
    description: '',
    category: 'Productivity',
    targetValue: '',
    unit: '',
    weightage: 10,
    startDate: '',
    endDate: '',
    status: 'active'
  });

  // Review form state
  const [reviewForm, setReviewForm] = useState({
    employee: '',
    reviewPeriod: {
      startDate: '',
      endDate: ''
    },
    goals: [],
    overallScore: 0,
    rating: 'Meets Expectations',
    strengths: [''],
    areasForImprovement: [''],
    supervisorComments: '',
    actionPlan: '',
    status: 'draft'
  });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch team members (employees reporting to this supervisor)
      const empResponse = await api.get('/employees');
      
      // Filter employees based on reportsTo relationship
      // reportsTo can be null, a string ID, or a populated object with _id
      const teamMembers = empResponse.data.filter(emp => {
        if (user.role === 'admin' || user.role === 'hr') {
          return true; // Admin/HR can see all employees
        }
        
        if (!emp.reportsTo) return false;
        
        // Handle both string ID and populated object
        const reportsToId = typeof emp.reportsTo === 'object' ? emp.reportsTo._id : emp.reportsTo;
        return reportsToId === user._id;
      });
      
      setEmployees(teamMembers);
      console.log(`Found ${teamMembers.length} team members for ${user.firstName}`);

      if (activeTab === 'goals') {
        const goalsResponse = await api.get('/kpi/supervisor/goals');
        setGoals(goalsResponse.data || []);
      } else if (activeTab === 'reviews') {
        const reviewsResponse = await api.get('/kpi/supervisor/reviews');
        setReviews(reviewsResponse.data || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoal = async (e) => {
    e.preventDefault();
    
    if (!goalForm.employee || !goalForm.title || !goalForm.targetValue) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      if (editingGoal) {
        // Update existing goal
        await api.put(`/kpi/goals/${editingGoal._id}`, goalForm);
        toast.success('KPI goal updated successfully');
      } else {
        // Create new goal
        await api.post('/kpi/goals', goalForm);
        toast.success('KPI goal created successfully');
      }
      setShowGoalModal(false);
      setEditingGoal(null);
      resetGoalForm();
      fetchData();
    } catch (error) {
      console.error('Error saving goal:', error);
      toast.error(error.response?.data?.message || 'Failed to save goal');
    }
  };

  const handleEditGoal = (goal) => {
    setEditingGoal(goal);
    setGoalForm({
      employee: goal.employee._id,
      title: goal.title,
      description: goal.description || '',
      category: goal.category,
      targetValue: goal.targetValue,
      unit: goal.unit,
      weightage: goal.weightage,
      startDate: goal.startDate ? new Date(goal.startDate).toISOString().split('T')[0] : '',
      endDate: goal.endDate ? new Date(goal.endDate).toISOString().split('T')[0] : '',
      status: goal.status
    });
    setShowGoalModal(true);
  };

  const handleDeleteGoal = async (goalId) => {
    if (!confirm('Are you sure you want to delete this goal?')) return;
    
    try {
      await api.delete(`/kpi/goals/${goalId}`);
      toast.success('Goal deleted successfully');
      fetchData();
    } catch (error) {
      console.error('Error deleting goal:', error);
      toast.error(error.response?.data?.message || 'Failed to delete goal');
    }
  };

  const handleCreateReview = async (e) => {
    e.preventDefault();
    
    if (!reviewForm.employee || !reviewForm.reviewPeriod.startDate || !reviewForm.reviewPeriod.endDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Calculate overall score from goals
    const totalWeightage = reviewForm.goals.reduce((sum, g) => sum + (g.weightage || 0), 0);
    const weightedScore = reviewForm.goals.reduce((sum, g) => {
      const achievement = g.achievement || 0;
      const weight = g.weightage || 0;
      return sum + (achievement * weight / 100);
    }, 0);
    
    const overallScore = totalWeightage > 0 ? Math.round(weightedScore) : 0;

    const reviewData = {
      ...reviewForm,
      overallScore,
      status: 'submitted'
    };

    try {
      await api.post('/kpi/reviews', reviewData);
      toast.success('Performance review submitted successfully');
      setShowReviewModal(false);
      resetReviewForm();
      fetchData();
    } catch (error) {
      console.error('Error creating review:', error);
      toast.error(error.response?.data?.message || 'Failed to submit review');
    }
  };

  const loadEmployeeGoals = async (employeeId) => {
    try {
      const response = await api.get(`/kpi/employee/${employeeId}/goals`);
      return response.data || [];
    } catch (error) {
      console.error('Error loading employee goals:', error);
      return [];
    }
  };

  const handleSelectEmployeeForReview = async (employeeId) => {
    setReviewForm(prev => ({ ...prev, employee: employeeId }));
    const employeeGoals = await loadEmployeeGoals(employeeId);
    
    // Convert goals to review goals format
    const reviewGoals = employeeGoals.map(goal => ({
      goalId: goal._id,
      title: goal.title,
      category: goal.category,
      targetValue: goal.targetValue,
      actualValue: 0,
      unit: goal.unit,
      weightage: goal.weightage,
      achievement: 0,
      supervisorComments: ''
    }));
    
    setReviewForm(prev => ({ ...prev, goals: reviewGoals }));
  };

  const resetGoalForm = () => {
    setGoalForm({
      employee: '',
      title: '',
      description: '',
      category: 'Productivity',
      targetValue: '',
      unit: '',
      weightage: 10,
      startDate: '',
      endDate: '',
      status: 'active'
    });
    setEditingGoal(null);
  };

  const resetReviewForm = () => {
    setReviewForm({
      employee: '',
      reviewPeriod: { startDate: '', endDate: '' },
      goals: [],
      overallScore: 0,
      rating: 'Meets Expectations',
      strengths: [''],
      areasForImprovement: [''],
      supervisorComments: '',
      actionPlan: '',
      status: 'draft'
    });
  };

  const updateReviewGoal = (index, field, value) => {
    const updatedGoals = [...reviewForm.goals];
    updatedGoals[index] = { ...updatedGoals[index], [field]: value };
    
    // Auto-calculate achievement percentage
    if (field === 'actualValue' || field === 'targetValue') {
      const target = field === 'targetValue' ? parseFloat(value) : updatedGoals[index].targetValue;
      const actual = field === 'actualValue' ? parseFloat(value) : updatedGoals[index].actualValue;
      
      if (target > 0) {
        updatedGoals[index].achievement = Math.min(100, Math.round((actual / target) * 100));
      }
    }
    
    setReviewForm(prev => ({ ...prev, goals: updatedGoals }));
  };

  const addStrength = () => {
    setReviewForm(prev => ({ ...prev, strengths: [...prev.strengths, ''] }));
  };

  const updateStrength = (index, value) => {
    const updated = [...reviewForm.strengths];
    updated[index] = value;
    setReviewForm(prev => ({ ...prev, strengths: updated }));
  };

  const removeStrength = (index) => {
    const updated = reviewForm.strengths.filter((_, i) => i !== index);
    setReviewForm(prev => ({ ...prev, strengths: updated.length ? updated : [''] }));
  };

  const addImprovement = () => {
    setReviewForm(prev => ({ ...prev, areasForImprovement: [...prev.areasForImprovement, ''] }));
  };

  const updateImprovement = (index, value) => {
    const updated = [...reviewForm.areasForImprovement];
    updated[index] = value;
    setReviewForm(prev => ({ ...prev, areasForImprovement: updated }));
  };

  const removeImprovement = (index) => {
    const updated = reviewForm.areasForImprovement.filter((_, i) => i !== index);
    setReviewForm(prev => ({ ...prev, areasForImprovement: updated.length ? updated : [''] }));
  };

  const filteredEmployees = employees.filter(emp =>
    `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employeeId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categories = ['Quality', 'Productivity', 'Efficiency', 'Innovation', 'Teamwork', 'Leadership', 'Customer Service', 'Other'];
  const ratings = ['Outstanding', 'Exceeds Expectations', 'Meets Expectations', 'Needs Improvement', 'Unsatisfactory'];

  return (
    <MainLayout>
      <div className="space-y-6 pb-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              Team Performance Management
            </h1>
            <p className="text-slate-400 mt-2">Manage KPI goals and performance reviews for your team</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/30">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <Users className="text-blue-400" size={24} />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Team Members</p>
                <p className="text-2xl font-bold text-white">{employees.length}</p>
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/20 rounded-lg">
                <Target className="text-green-400" size={24} />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Active Goals</p>
                <p className="text-2xl font-bold text-white">{goals.filter(g => g.status === 'active').length}</p>
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <Award className="text-purple-400" size={24} />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Reviews</p>
                <p className="text-2xl font-bold text-white">{reviews.length}</p>
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border-yellow-500/30">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-500/20 rounded-lg">
                <TrendingUp className="text-yellow-400" size={24} />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Pending</p>
                <p className="text-2xl font-bold text-white">
                  {reviews.filter(r => r.status === 'submitted').length}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-700">
          <button
            onClick={() => setActiveTab('goals')}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === 'goals'
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <Target size={20} />
              KPI Goals
            </div>
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === 'reviews'
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <Award size={20} />
              Performance Reviews
            </div>
          </button>
          <button
            onClick={() => setActiveTab('team')}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === 'team'
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users size={20} />
              Team Members
            </div>
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {activeTab === 'goals' && (
            <>
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">KPI Goals</h2>
                <Button
                  onClick={() => setShowGoalModal(true)}
                  className="flex items-center gap-2"
                >
                  <Plus size={18} />
                  Create Goal
                </Button>
              </div>

              {loading ? (
                <Card><div className="text-center py-12 text-slate-400">Loading...</div></Card>
              ) : goals.length === 0 ? (
                <Card><div className="text-center py-12 text-slate-400">No goals created yet</div></Card>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {goals.map(goal => (
                    <Card key={goal._id} className="hover:border-cyan-500/50 transition-all">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-bold text-white">{goal.title}</h3>
                            <Badge variant={goal.status === 'active' ? 'blue' : 'gray'}>{goal.status}</Badge>
                            <Badge variant="purple">{goal.category}</Badge>
                          </div>
                          <p className="text-sm text-slate-400 mb-3">{goal.description}</p>
                          <div className="grid grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-slate-500">Employee</p>
                              <p className="text-white font-semibold">
                                {goal.employee?.firstName} {goal.employee?.lastName}
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-500">Target</p>
                              <p className="text-white font-semibold">{goal.targetValue} {goal.unit}</p>
                            </div>
                            <div>
                              <p className="text-slate-500">Weightage</p>
                              <p className="text-white font-semibold">{goal.weightage}%</p>
                            </div>
                            <div>
                              <p className="text-slate-500">Period</p>
                              <p className="text-white font-semibold">
                                {format(new Date(goal.startDate), 'MMM dd')} - {format(new Date(goal.endDate), 'MMM dd, yyyy')}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => handleEditGoal(goal)}
                            className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-all"
                            title="Edit goal"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteGoal(goal._id)}
                            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all"
                            title="Delete goal"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'reviews' && (
            <>
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">Performance Reviews</h2>
                <Button
                  onClick={() => setShowReviewModal(true)}
                  className="flex items-center gap-2"
                >
                  <Plus size={18} />
                  Create Review
                </Button>
              </div>

              {loading ? (
                <Card><div className="text-center py-12 text-slate-400">Loading...</div></Card>
              ) : reviews.length === 0 ? (
                <Card><div className="text-center py-12 text-slate-400">No reviews submitted yet</div></Card>
              ) : (
                <div className="space-y-4">
                  {reviews.map(review => (
                    <Card key={review._id} className="hover:border-cyan-500/50 transition-all">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h3 className="text-lg font-bold text-white">Performance Review</h3>
                            <Badge variant={review.status === 'acknowledged' ? 'green' : 'yellow'}>{review.status}</Badge>
                            <Badge variant="purple">{review.rating}</Badge>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                            <div>
                              <p className="text-slate-500">Employee</p>
                              <p className="text-white font-semibold">
                                {review.employee?.firstName} {review.employee?.lastName}
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-500">Score</p>
                              <p className="text-white font-semibold">{review.overallScore}%</p>
                            </div>
                            <div>
                              <p className="text-slate-500">Period</p>
                              <p className="text-white font-semibold">
                                {format(new Date(review.reviewPeriod.startDate), 'MMM dd')} - {format(new Date(review.reviewPeriod.endDate), 'MMM dd, yyyy')}
                              </p>
                            </div>
                          </div>
                          {review.employeeComments && (
                            <div className="bg-purple-500/10 border border-purple-500/30 rounded p-3 mt-3">
                              <p className="text-xs text-purple-400 font-semibold mb-1">Employee Response:</p>
                              <p className="text-sm text-slate-300">{review.employeeComments}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'team' && (
            <>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">Team Members</h2>
                <div className="w-64">
                  <Input
                    icon={Search}
                    placeholder="Search employees..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredEmployees.map(emp => (
                  <Card key={emp._id} className="hover:border-cyan-500/50 transition-all">
                    <div className="flex items-start gap-4">
                      <img
                        src={emp.profileImage || `https://ui-avatars.com/api/?name=${emp.firstName}+${emp.lastName}&background=0D8ABC&color=fff`}
                        alt={`${emp.firstName} ${emp.lastName}`}
                        className="w-16 h-16 rounded-full"
                      />
                      <div className="flex-1">
                        <h3 className="font-bold text-white">{emp.firstName} {emp.lastName}</h3>
                        <p className="text-sm text-slate-400">{emp.email}</p>
                        <p className="text-xs text-slate-500 mt-1">ID: {emp.employeeId}</p>
                        <p className="text-xs text-slate-500">{emp.department}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Create Goal Modal */}
        {showGoalModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-700 sticky top-0 bg-slate-800 z-10">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white">{editingGoal ? 'Edit KPI Goal' : 'Create KPI Goal'}</h2>
                  <button 
                    onClick={() => {
                      setShowGoalModal(false);
                      setEditingGoal(null);
                      resetGoalForm();
                    }} 
                    className="text-slate-400 hover:text-white"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              <form onSubmit={handleCreateGoal} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Employee *</label>
                  <select
                    value={goalForm.employee}
                    onChange={(e) => setGoalForm({ ...goalForm, employee: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg p-3 text-white"
                    required
                  >
                    <option value="">Select Employee</option>
                    {employees.map(emp => (
                      <option key={emp._id} value={emp._id}>
                        {emp.firstName} {emp.lastName} ({emp.employeeId})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Goal Title *</label>
                  <Input
                    value={goalForm.title}
                    onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
                    placeholder="e.g., Complete 10 Client Projects"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Description</label>
                  <textarea
                    value={goalForm.description}
                    onChange={(e) => setGoalForm({ ...goalForm, description: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg p-3 text-white"
                    rows="3"
                    placeholder="Describe the goal..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Category *</label>
                    <select
                      value={goalForm.category}
                      onChange={(e) => setGoalForm({ ...goalForm, category: e.target.value })}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg p-3 text-white"
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Weightage (%) *</label>
                    <Input
                      type="number"
                      min="1"
                      max="100"
                      value={goalForm.weightage}
                      onChange={(e) => setGoalForm({ ...goalForm, weightage: parseInt(e.target.value) })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Target Value *</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={goalForm.targetValue}
                      onChange={(e) => setGoalForm({ ...goalForm, targetValue: e.target.value })}
                      placeholder="e.g., 10"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Unit *</label>
                    <Input
                      value={goalForm.unit}
                      onChange={(e) => setGoalForm({ ...goalForm, unit: e.target.value })}
                      placeholder="e.g., projects, %, hours"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Start Date *</label>
                    <Input
                      type="date"
                      value={goalForm.startDate}
                      onChange={(e) => setGoalForm({ ...goalForm, startDate: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">End Date *</label>
                    <Input
                      type="date"
                      value={goalForm.endDate}
                      onChange={(e) => setGoalForm({ ...goalForm, endDate: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="submit" className="flex-1">{editingGoal ? 'Update Goal' : 'Create Goal'}</Button>
                  <Button 
                    type="button" 
                    onClick={() => {
                      setShowGoalModal(false);
                      setEditingGoal(null);
                      resetGoalForm();
                    }} 
                    className="flex-1 bg-slate-600 hover:bg-slate-700"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Create Review Modal */}
        {showReviewModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-slate-800 rounded-xl max-w-4xl w-full my-8">
              <div className="p-6 border-b border-slate-700 sticky top-0 bg-slate-800 z-10">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white">Create Performance Review</h2>
                  <button onClick={() => setShowReviewModal(false)} className="text-slate-400 hover:text-white">
                    <X size={24} />
                  </button>
                </div>
              </div>

              <form onSubmit={handleCreateReview} className="p-6 space-y-6 max-h-[calc(90vh-120px)] overflow-y-auto">
                {/* Employee Selection */}
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Employee *</label>
                  <select
                    value={reviewForm.employee}
                    onChange={(e) => handleSelectEmployeeForReview(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg p-3 text-white"
                    required
                  >
                    <option value="">Select Employee</option>
                    {employees.map(emp => (
                      <option key={emp._id} value={emp._id}>
                        {emp.firstName} {emp.lastName} ({emp.employeeId})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Review Period */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Period Start *</label>
                    <Input
                      type="date"
                      value={reviewForm.reviewPeriod.startDate}
                      onChange={(e) => setReviewForm({ 
                        ...reviewForm, 
                        reviewPeriod: { ...reviewForm.reviewPeriod, startDate: e.target.value }
                      })}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Period End *</label>
                    <Input
                      type="date"
                      value={reviewForm.reviewPeriod.endDate}
                      onChange={(e) => setReviewForm({ 
                        ...reviewForm, 
                        reviewPeriod: { ...reviewForm.reviewPeriod, endDate: e.target.value }
                      })}
                      required
                    />
                  </div>
                </div>

                {/* Goals Evaluation */}
                {reviewForm.goals.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-white mb-3">KPI Goals Evaluation</h3>
                    <div className="space-y-4">
                      {reviewForm.goals.map((goal, index) => (
                        <div key={index} className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="font-semibold text-white">{goal.title}</h4>
                              <Badge variant="blue" className="text-xs mt-1">{goal.category}</Badge>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-slate-400">Weightage</p>
                              <p className="text-lg font-bold text-cyan-400">{goal.weightage}%</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-3 mb-3">
                            <div>
                              <label className="block text-xs text-slate-400 mb-1">Target</label>
                              <Input
                                type="number"
                                step="0.01"
                                value={goal.targetValue}
                                onChange={(e) => updateReviewGoal(index, 'targetValue', e.target.value)}
                                className="text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-slate-400 mb-1">Actual *</label>
                              <Input
                                type="number"
                                step="0.01"
                                value={goal.actualValue}
                                onChange={(e) => updateReviewGoal(index, 'actualValue', e.target.value)}
                                className="text-sm"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-slate-400 mb-1">Achievement</label>
                              <div className="flex items-center gap-2 mt-2">
                                <div className="flex-1 bg-slate-600 rounded-full h-2">
                                  <div 
                                    className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full"
                                    style={{ width: `${Math.min(100, goal.achievement || 0)}%` }}
                                  />
                                </div>
                                <span className="text-sm font-bold text-white w-12 text-right">{goal.achievement || 0}%</span>
                              </div>
                            </div>
                          </div>

                          <textarea
                            value={goal.supervisorComments}
                            onChange={(e) => updateReviewGoal(index, 'supervisorComments', e.target.value)}
                            className="w-full bg-slate-700 border border-slate-600 rounded-lg p-2 text-white text-sm"
                            rows="2"
                            placeholder="Comments on this goal..."
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Rating */}
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Overall Rating *</label>
                  <select
                    value={reviewForm.rating}
                    onChange={(e) => setReviewForm({ ...reviewForm, rating: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg p-3 text-white"
                  >
                    {ratings.map(rating => (
                      <option key={rating} value={rating}>{rating}</option>
                    ))}
                  </select>
                </div>

                {/* Strengths */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-slate-300">Strengths</label>
                    <button type="button" onClick={addStrength} className="text-cyan-400 text-sm hover:underline">
                      + Add Strength
                    </button>
                  </div>
                  {reviewForm.strengths.map((strength, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <Input
                        value={strength}
                        onChange={(e) => updateStrength(index, e.target.value)}
                        placeholder="e.g., Excellent project delivery"
                        className="flex-1"
                      />
                      {reviewForm.strengths.length > 1 && (
                        <button type="button" onClick={() => removeStrength(index)} className="text-red-400 hover:text-red-300">
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Areas for Improvement */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-slate-300">Areas for Improvement</label>
                    <button type="button" onClick={addImprovement} className="text-cyan-400 text-sm hover:underline">
                      + Add Area
                    </button>
                  </div>
                  {reviewForm.areasForImprovement.map((area, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <Input
                        value={area}
                        onChange={(e) => updateImprovement(index, e.target.value)}
                        placeholder="e.g., Enhance communication skills"
                        className="flex-1"
                      />
                      {reviewForm.areasForImprovement.length > 1 && (
                        <button type="button" onClick={() => removeImprovement(index)} className="text-red-400 hover:text-red-300">
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Overall Comments */}
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Overall Comments</label>
                  <textarea
                    value={reviewForm.supervisorComments}
                    onChange={(e) => setReviewForm({ ...reviewForm, supervisorComments: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg p-3 text-white"
                    rows="4"
                    placeholder="Provide comprehensive feedback..."
                  />
                </div>

                {/* Action Plan */}
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Action Plan</label>
                  <textarea
                    value={reviewForm.actionPlan}
                    onChange={(e) => setReviewForm({ ...reviewForm, actionPlan: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg p-3 text-white"
                    rows="3"
                    placeholder="Define development actions and next steps..."
                  />
                </div>

                <div className="flex gap-3 pt-4 sticky bottom-0 bg-slate-800 pb-2">
                  <Button type="submit" className="flex-1">Submit Review</Button>
                  <Button type="button" onClick={() => setShowReviewModal(false)} className="flex-1 bg-slate-600 hover:bg-slate-700">
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default SupervisorPerformance;
