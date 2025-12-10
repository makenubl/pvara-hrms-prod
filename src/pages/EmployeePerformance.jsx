import React, { useState, useEffect } from 'react';
import { 
  Target, TrendingUp, Award, Calendar, Eye, MessageSquare, 
  CheckCircle, AlertCircle, BarChart3, Trophy, Star, FileText
} from 'lucide-react';
import MainLayout from '../layouts/MainLayout';
import { Card, Button, Badge } from '../components/UI';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import api from '../services/api';

const EmployeePerformance = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('reviews');
  const [reviews, setReviews] = useState([]);
  const [goals, setGoals] = useState([]);
  const [selectedReview, setSelectedReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [employeeComments, setEmployeeComments] = useState('');

  useEffect(() => {
    fetchPerformanceData();
  }, [activeTab]);

  const fetchPerformanceData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'reviews') {
        const response = await api.get('/kpi/reviews');
        setReviews(response.data || []);
      } else {
        const response = await api.get('/kpi/goals');
        setGoals(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching performance data:', error);
      toast.error('Failed to load performance data');
    } finally {
      setLoading(false);
    }
  };

  const handleViewReview = async (reviewId) => {
    try {
      const response = await api.get(`/kpi/reviews/${reviewId}`);
      setSelectedReview(response.data);
      setEmployeeComments(response.data.employeeComments || '');
      setShowReviewModal(true);
    } catch (error) {
      console.error('Error fetching review details:', error);
      toast.error('Failed to load review details');
    }
  };

  const handleAcknowledge = async () => {
    try {
      await api.put(`/kpi/reviews/${selectedReview._id}/acknowledge`, {
        employeeComments
      });
      toast.success('Review acknowledged successfully');
      setShowReviewModal(false);
      fetchPerformanceData();
    } catch (error) {
      console.error('Error acknowledging review:', error);
      toast.error('Failed to acknowledge review');
    }
  };

  const handleDispute = async () => {
    if (!employeeComments.trim()) {
      toast.error('Please provide comments explaining your concerns');
      return;
    }
    
    try {
      await api.put(`/kpi/reviews/${selectedReview._id}/dispute`, {
        employeeComments
      });
      toast.success('Review disputed. Your comments have been recorded.');
      setShowReviewModal(false);
      fetchPerformanceData();
    } catch (error) {
      console.error('Error disputing review:', error);
      toast.error('Failed to dispute review');
    }
  };

  const getRatingColor = (rating) => {
    const colors = {
      'Outstanding': 'bg-green-500/20 text-green-300 border-green-500/50',
      'Exceeds Expectations': 'bg-blue-500/20 text-blue-300 border-blue-500/50',
      'Meets Expectations': 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50',
      'Needs Improvement': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50',
      'Unsatisfactory': 'bg-red-500/20 text-red-300 border-red-500/50'
    };
    return colors[rating] || 'bg-slate-500/20 text-slate-300 border-slate-500/50';
  };

  const getStatusBadge = (status) => {
    const variants = {
      'submitted': 'yellow',
      'acknowledged': 'green',
      'disputed': 'red',
      'active': 'blue',
      'completed': 'green'
    };
    return <Badge variant={variants[status] || 'gray'}>{status}</Badge>;
  };

  const calculateGoalProgress = (goal) => {
    if (!goal.targetValue || goal.targetValue === 0) return 0;
    const actual = goal.actualValue || 0;
    return Math.min(100, Math.round((actual / goal.targetValue) * 100));
  };

  return (
    <MainLayout>
      <div className="space-y-6 pb-6">
        {/* Header */}
        <div className="animate-fade-in">
          <h1 className="text-4xl font-black bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
            My Performance Reviews
          </h1>
          <p className="text-slate-400 mt-2">View your KPI goals and performance evaluations</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/30">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <FileText className="text-blue-400" size={24} />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Total Reviews</p>
                <p className="text-2xl font-bold text-white">{reviews.length}</p>
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/20 rounded-lg">
                <CheckCircle className="text-green-400" size={24} />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Acknowledged</p>
                <p className="text-2xl font-bold text-white">
                  {reviews.filter(r => r.status === 'acknowledged').length}
                </p>
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border-yellow-500/30">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-500/20 rounded-lg">
                <Target className="text-yellow-400" size={24} />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Active Goals</p>
                <p className="text-2xl font-bold text-white">
                  {goals.filter(g => g.status === 'active').length}
                </p>
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <Trophy className="text-purple-400" size={24} />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Avg Score</p>
                <p className="text-2xl font-bold text-white">
                  {reviews.length > 0 
                    ? (reviews.reduce((sum, r) => sum + (r.overallScore || 0), 0) / reviews.length).toFixed(1)
                    : '0.0'}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-700">
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
        </div>

        {/* Content */}
        {loading ? (
          <Card>
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
            </div>
          </Card>
        ) : activeTab === 'reviews' ? (
          <div className="space-y-4">
            {reviews.length === 0 ? (
              <Card>
                <div className="text-center py-12">
                  <Award className="mx-auto text-slate-600 mb-4" size={48} />
                  <p className="text-slate-400">No performance reviews yet</p>
                  <p className="text-slate-500 text-sm mt-2">
                    Your supervisor will submit reviews here
                  </p>
                </div>
              </Card>
            ) : (
              reviews.map((review) => (
                <Card key={review._id} className="hover:border-cyan-500/50 transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-xl font-bold text-white">
                          Performance Review
                        </h3>
                        {getStatusBadge(review.status)}
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${getRatingColor(review.rating)}`}>
                          {review.rating}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="flex items-center gap-2 text-slate-300">
                          <Calendar size={16} className="text-slate-400" />
                          <span className="text-sm">
                            Period: {format(new Date(review.reviewPeriod.startDate), 'MMM dd, yyyy')} - {format(new Date(review.reviewPeriod.endDate), 'MMM dd, yyyy')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-300">
                          <TrendingUp size={16} className="text-slate-400" />
                          <span className="text-sm">Overall Score: {review.overallScore}%</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-slate-400 mb-4">
                        <img 
                          src={review.supervisor?.profileImage || `https://ui-avatars.com/api/?name=${review.supervisor?.firstName}+${review.supervisor?.lastName}&background=0D8ABC&color=fff`}
                          alt={`${review.supervisor?.firstName} ${review.supervisor?.lastName}`}
                          className="w-8 h-8 rounded-full"
                        />
                        <span className="text-sm">
                          Reviewed by: {review.supervisor?.firstName} {review.supervisor?.lastName}
                        </span>
                        <span className="text-xs">
                          ({format(new Date(review.submittedDate), 'MMM dd, yyyy')})
                        </span>
                      </div>

                      {/* Goals Summary */}
                      <div className="bg-slate-800/50 rounded-lg p-4 mb-4">
                        <h4 className="text-sm font-semibold text-slate-300 mb-3">KPI Goals ({review.goals?.length || 0})</h4>
                        <div className="space-y-2">
                          {review.goals?.slice(0, 3).map((goal, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm">
                              <span className="text-slate-400">{goal.title}</span>
                              <div className="flex items-center gap-2">
                                <div className="w-24 bg-slate-700 rounded-full h-2">
                                  <div 
                                    className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full"
                                    style={{ width: `${goal.achievement || 0}%` }}
                                  />
                                </div>
                                <span className="text-slate-300 w-12 text-right">{goal.achievement || 0}%</span>
                              </div>
                            </div>
                          ))}
                          {review.goals?.length > 3 && (
                            <p className="text-xs text-slate-500">+{review.goals.length - 3} more goals</p>
                          )}
                        </div>
                      </div>

                      {review.supervisorComments && (
                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-4">
                          <p className="text-xs font-semibold text-blue-400 mb-2">Supervisor Comments</p>
                          <p className="text-sm text-slate-300">{review.supervisorComments}</p>
                        </div>
                      )}

                      {review.employeeComments && (
                        <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                          <p className="text-xs font-semibold text-purple-400 mb-2">Your Comments</p>
                          <p className="text-sm text-slate-300">{review.employeeComments}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 ml-4">
                      <Button
                        onClick={() => handleViewReview(review._id)}
                        className="flex items-center gap-2 whitespace-nowrap"
                      >
                        <Eye size={16} />
                        View Details
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {goals.length === 0 ? (
              <Card>
                <div className="text-center py-12">
                  <Target className="mx-auto text-slate-600 mb-4" size={48} />
                  <p className="text-slate-400">No KPI goals set yet</p>
                  <p className="text-slate-500 text-sm mt-2">
                    Your supervisor will set goals for you
                  </p>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {goals.map((goal) => (
                  <Card key={goal._id} className="hover:border-cyan-500/50 transition-all">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-bold text-white">{goal.title}</h3>
                          {getStatusBadge(goal.status)}
                        </div>
                        <p className="text-sm text-slate-400 mb-3">{goal.description}</p>
                      </div>
                      <div className="p-2 bg-cyan-500/20 rounded-lg">
                        <Target className="text-cyan-400" size={20} />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">Category</span>
                        <Badge variant="blue">{goal.category}</Badge>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">Target</span>
                        <span className="text-white font-semibold">
                          {goal.targetValue} {goal.unit}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">Weightage</span>
                        <span className="text-white font-semibold">{goal.weightage}%</span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">Period</span>
                        <span className="text-slate-300 text-xs">
                          {format(new Date(goal.startDate), 'MMM dd')} - {format(new Date(goal.endDate), 'MMM dd, yyyy')}
                        </span>
                      </div>

                      <div className="pt-3 border-t border-slate-700">
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <img 
                            src={goal.supervisor?.profileImage || `https://ui-avatars.com/api/?name=${goal.supervisor?.firstName}+${goal.supervisor?.lastName}&background=0D8ABC&color=fff`}
                            alt={`${goal.supervisor?.firstName} ${goal.supervisor?.lastName}`}
                            className="w-6 h-6 rounded-full"
                          />
                          Set by: {goal.supervisor?.firstName} {goal.supervisor?.lastName}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Review Details Modal */}
        {showReviewModal && selectedReview && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-700 sticky top-0 bg-slate-800 z-10">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white">Performance Review Details</h2>
                  <button
                    onClick={() => setShowReviewModal(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Review Header */}
                <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">Overall Performance</h3>
                      <div className="flex items-center gap-3">
                        <span className={`px-4 py-2 rounded-lg text-lg font-bold border ${getRatingColor(selectedReview.rating)}`}>
                          {selectedReview.rating}
                        </span>
                        <div className="flex items-center gap-2">
                          <Star className="text-yellow-400 fill-yellow-400" size={24} />
                          <span className="text-3xl font-bold text-white">{selectedReview.overallScore}%</span>
                        </div>
                      </div>
                    </div>
                    {getStatusBadge(selectedReview.status)}
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-400 mb-1">Review Period</p>
                      <p className="text-white font-semibold">
                        {format(new Date(selectedReview.reviewPeriod.startDate), 'MMM dd, yyyy')} - {format(new Date(selectedReview.reviewPeriod.endDate), 'MMM dd, yyyy')}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400 mb-1">Submitted</p>
                      <p className="text-white font-semibold">
                        {format(new Date(selectedReview.submittedDate), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* KPI Goals Detailed */}
                <div>
                  <h4 className="text-lg font-bold text-white mb-4">KPI Goals Performance</h4>
                  <div className="space-y-4">
                    {selectedReview.goals?.map((goal, idx) => (
                      <div key={idx} className="bg-slate-700/30 rounded-lg p-4 border border-slate-600">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h5 className="font-semibold text-white mb-1">{goal.title}</h5>
                            <Badge variant="blue" className="text-xs">{goal.category}</Badge>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-slate-400 mb-1">Achievement</p>
                            <p className="text-2xl font-bold text-cyan-400">{goal.achievement}%</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
                          <div>
                            <p className="text-slate-400">Target</p>
                            <p className="text-white font-semibold">{goal.targetValue} {goal.unit}</p>
                          </div>
                          <div>
                            <p className="text-slate-400">Actual</p>
                            <p className="text-white font-semibold">{goal.actualValue || 0} {goal.unit}</p>
                          </div>
                          <div>
                            <p className="text-slate-400">Weightage</p>
                            <p className="text-white font-semibold">{goal.weightage}%</p>
                          </div>
                        </div>

                        <div className="w-full bg-slate-700 rounded-full h-3 mb-3">
                          <div 
                            className="bg-gradient-to-r from-cyan-500 to-blue-500 h-3 rounded-full transition-all"
                            style={{ width: `${goal.achievement || 0}%` }}
                          />
                        </div>

                        {goal.supervisorComments && (
                          <div className="bg-slate-800/50 rounded p-3 mt-3">
                            <p className="text-xs text-slate-400 mb-1">Comments</p>
                            <p className="text-sm text-slate-200">{goal.supervisorComments}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Strengths */}
                {selectedReview.strengths?.length > 0 && (
                  <div>
                    <h4 className="text-lg font-bold text-white mb-3">Strengths</h4>
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                      <ul className="space-y-2">
                        {selectedReview.strengths.map((strength, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-slate-200">
                            <CheckCircle size={16} className="text-green-400 mt-1 flex-shrink-0" />
                            <span>{strength}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Areas for Improvement */}
                {selectedReview.areasForImprovement?.length > 0 && (
                  <div>
                    <h4 className="text-lg font-bold text-white mb-3">Areas for Improvement</h4>
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                      <ul className="space-y-2">
                        {selectedReview.areasForImprovement.map((area, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-slate-200">
                            <AlertCircle size={16} className="text-yellow-400 mt-1 flex-shrink-0" />
                            <span>{area}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Supervisor Comments */}
                {selectedReview.supervisorComments && (
                  <div>
                    <h4 className="text-lg font-bold text-white mb-3">Supervisor's Overall Comments</h4>
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                      <p className="text-slate-200">{selectedReview.supervisorComments}</p>
                    </div>
                  </div>
                )}

                {/* Action Plan */}
                {selectedReview.actionPlan && (
                  <div>
                    <h4 className="text-lg font-bold text-white mb-3">Action Plan</h4>
                    <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                      <p className="text-slate-200">{selectedReview.actionPlan}</p>
                    </div>
                  </div>
                )}

                {/* Employee Response Section */}
                {selectedReview.status === 'submitted' && (
                  <div>
                    <h4 className="text-lg font-bold text-white mb-3">Your Response</h4>
                    <textarea
                      value={employeeComments}
                      onChange={(e) => setEmployeeComments(e.target.value)}
                      placeholder="Add your comments (optional for acknowledgment, required for dispute)..."
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg p-4 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 min-h-[120px]"
                    />
                    <div className="flex gap-3 mt-4">
                      <Button
                        onClick={handleAcknowledge}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle size={18} className="mr-2" />
                        Acknowledge Review
                      </Button>
                      <Button
                        onClick={handleDispute}
                        className="flex-1 bg-red-600 hover:bg-red-700"
                      >
                        <AlertCircle size={18} className="mr-2" />
                        Dispute Review
                      </Button>
                    </div>
                    <p className="text-xs text-slate-400 mt-2 text-center">
                      Note: Disputing requires you to provide comments explaining your concerns
                    </p>
                  </div>
                )}

                {selectedReview.status === 'acknowledged' && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-green-400 mb-2">
                      <CheckCircle size={20} />
                      <span className="font-semibold">Review Acknowledged</span>
                    </div>
                    {selectedReview.acknowledgedDate && (
                      <p className="text-sm text-slate-400">
                        Acknowledged on {format(new Date(selectedReview.acknowledgedDate), 'MMM dd, yyyy')}
                      </p>
                    )}
                    {selectedReview.employeeComments && (
                      <div className="mt-3 pt-3 border-t border-green-500/30">
                        <p className="text-xs text-green-400 mb-1">Your Comments:</p>
                        <p className="text-sm text-slate-200">{selectedReview.employeeComments}</p>
                      </div>
                    )}
                  </div>
                )}

                {selectedReview.status === 'disputed' && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-red-400 mb-2">
                      <AlertCircle size={20} />
                      <span className="font-semibold">Review Disputed</span>
                    </div>
                    {selectedReview.acknowledgedDate && (
                      <p className="text-sm text-slate-400">
                        Disputed on {format(new Date(selectedReview.acknowledgedDate), 'MMM dd, yyyy')}
                      </p>
                    )}
                    {selectedReview.employeeComments && (
                      <div className="mt-3 pt-3 border-t border-red-500/30">
                        <p className="text-xs text-red-400 mb-1">Your Comments:</p>
                        <p className="text-sm text-slate-200">{selectedReview.employeeComments}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

const X = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

export default EmployeePerformance;
