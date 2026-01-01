import React, { useState, useEffect } from 'react';
import {
  Link2,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  MessageSquare,
  Send,
  Bell,
  ArrowUpRight,
  Plus,
  User,
  Calendar,
  ChevronDown,
  ChevronUp,
  Paperclip,
} from 'lucide-react';
import { Card, Button, Badge, Modal, Input, Select } from './UI';
import taskService from '../services/taskService';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const DEPENDENCY_CATEGORIES = [
  { value: 'information', label: 'Information Request' },
  { value: 'document', label: 'Document Required' },
  { value: 'approval', label: 'Approval Needed' },
  { value: 'review', label: 'Review Required' },
  { value: 'resource', label: 'Resource/Access' },
  { value: 'action', label: 'Action Required' },
  { value: 'other', label: 'Other' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', color: 'gray' },
  { value: 'medium', label: 'Medium', color: 'yellow' },
  { value: 'high', label: 'High', color: 'red' },
  { value: 'critical', label: 'Critical', color: 'purple' },
];

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'yellow', icon: Clock },
  acknowledged: { label: 'Acknowledged', color: 'cyan', icon: CheckCircle },
  'in-progress': { label: 'In Progress', color: 'blue', icon: Clock },
  fulfilled: { label: 'Fulfilled', color: 'green', icon: CheckCircle },
  declined: { label: 'Declined', color: 'red', icon: XCircle },
  escalated: { label: 'Escalated', color: 'purple', icon: AlertTriangle },
};

// Create Dependency Modal
export const CreateDependencyModal = ({ isOpen, onClose, taskId, employees, onCreated }) => {
  const [formData, setFormData] = useState({
    dependsOn: '',
    title: '',
    description: '',
    category: 'information',
    priority: 'medium',
    dueDate: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.dependsOn || !formData.title.trim()) {
      toast.error('Please select a person and provide a title');
      return;
    }

    setSubmitting(true);
    try {
      await taskService.createDependency(taskId, {
        ...formData,
        dueDate: formData.dueDate || undefined,
      });
      toast.success('Dependency created successfully');
      onCreated?.();
      onClose();
      setFormData({
        dependsOn: '',
        title: '',
        description: '',
        category: 'information',
        priority: 'medium',
        dueDate: '',
      });
    } catch (error) {
      toast.error(error.message || 'Failed to create dependency');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Mark Dependency">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Depends On <span className="text-red-400">*</span>
          </label>
          <select
            value={formData.dependsOn}
            onChange={(e) => setFormData({ ...formData, dependsOn: e.target.value })}
            className="w-full bg-slate-800/50 border border-white/20 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50"
            required
          >
            <option value="">Select person...</option>
            {employees.map((emp) => (
              <option key={emp._id} value={emp._id}>
                {emp.firstName} {emp.lastName} - {emp.department || 'No Dept'}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            What do you need? <span className="text-red-400">*</span>
          </label>
          <Input
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g., Budget approval document"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Details (Optional)
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Provide more context about what you need..."
            rows={3}
            className="w-full bg-slate-800/50 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full bg-slate-800/50 border border-white/20 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50"
            >
              {DEPENDENCY_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Priority</label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              className="w-full bg-slate-800/50 border border-white/20 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50"
            >
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Due Date (Optional)
          </label>
          <Input
            type="date"
            value={formData.dueDate}
            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create Dependency'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// Single Dependency Item with Comment Thread
export const DependencyItem = ({
  dependency,
  taskId: propTaskId,
  currentUserId,
  isManager,
  onUpdate,
  employees,
  compact = false,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showActions, setShowActions] = useState(false);

  // Use taskId from prop, or fall back to taskId stored in dependency (from My Dependencies page)
  const taskId = propTaskId || dependency.taskId;

  const status = STATUS_CONFIG[dependency.status] || STATUS_CONFIG.pending;
  const StatusIcon = status.icon;

  const isRequester = dependency.requestedBy?._id === currentUserId;
  const isResponder = dependency.dependsOn?._id === currentUserId;

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleStatusChange = async (newStatus, declineReason = null) => {
    setSubmitting(true);
    try {
      await taskService.respondToDependency(taskId, dependency.dependencyId || dependency._id, {
        status: newStatus,
        declineReason,
      });
      toast.success(`Dependency ${newStatus}`);
      onUpdate?.();
    } catch (error) {
      toast.error(error.message || 'Failed to update');
    } finally {
      setSubmitting(false);
      setShowActions(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      await taskService.addDependencyComment(taskId, dependency.dependencyId || dependency._id, newComment);
      toast.success('Comment added');
      setNewComment('');
      onUpdate?.();
    } catch (error) {
      toast.error(error.message || 'Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendReminder = async () => {
    try {
      await taskService.sendDependencyReminder(taskId, dependency.dependencyId || dependency._id);
      toast.success('Reminder sent!');
      onUpdate?.();
    } catch (error) {
      toast.error(error.message || 'Failed to send reminder');
    }
  };

  const handleEscalate = async () => {
    const reason = prompt('Reason for escalation:');
    if (!reason) return;

    try {
      await taskService.escalateDependency(taskId, dependency.dependencyId || dependency._id, null, reason);
      toast.success('Dependency escalated');
      onUpdate?.();
    } catch (error) {
      toast.error(error.message || 'Failed to escalate');
    }
  };

  const priorityColors = {
    low: 'gray',
    medium: 'yellow',
    high: 'red',
    critical: 'purple',
  };

  return (
    <div className="bg-slate-800/30 border border-white/10 rounded-xl p-4 hover:border-white/20 transition-all">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={status.color}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {status.label}
            </Badge>
            <Badge variant={priorityColors[dependency.priority]}>
              {dependency.priority}
            </Badge>
            {dependency.category && (
              <span className="text-xs text-slate-400">
                {DEPENDENCY_CATEGORIES.find(c => c.value === dependency.category)?.label}
              </span>
            )}
          </div>
          <h4 className="font-semibold text-white mt-2">{dependency.title}</h4>
          {dependency.description && !compact && (
            <p className="text-sm text-slate-400 mt-1 line-clamp-2">{dependency.description}</p>
          )}
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-slate-400 hover:text-white transition-colors"
        >
          {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>

      {/* Participants */}
      <div className="flex items-center gap-4 mt-3 text-sm">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-cyan-400" />
          <span className="text-slate-400">From:</span>
          <span className="text-white">
            {dependency.requestedBy?.firstName} {dependency.requestedBy?.lastName}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-purple-400" />
          <span className="text-slate-400">To:</span>
          <span className="text-white">
            {dependency.dependsOn?.firstName} {dependency.dependsOn?.lastName}
          </span>
        </div>
        {dependency.dueDate && (
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-400" />
            <span className={`${new Date(dependency.dueDate) < new Date() && dependency.status !== 'fulfilled' ? 'text-red-400' : 'text-slate-300'}`}>
              {formatDate(dependency.dueDate)}
            </span>
          </div>
        )}
      </div>

      {/* Task context (when showing from My Dependencies page) */}
      {dependency.taskTitle && !compact && (
        <div className="mt-2 text-sm text-slate-400">
          <span>Task: </span>
          <span className="text-cyan-400">{dependency.taskTitle}</span>
          {dependency.taskProject && <span className="text-slate-500"> ({dependency.taskProject})</span>}
        </div>
      )}

      {/* Expanded Content */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-white/10">
          {/* Response */}
          {dependency.response && (
            <div className="mb-4 p-3 bg-slate-700/30 rounded-lg">
              <p className="text-sm text-slate-300">{dependency.response}</p>
              <p className="text-xs text-slate-500 mt-1">
                Response at {formatDate(dependency.respondedAt)} {formatTime(dependency.respondedAt)}
              </p>
            </div>
          )}

          {/* Decline Reason */}
          {dependency.declineReason && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-300">
                <span className="font-semibold">Decline reason:</span> {dependency.declineReason}
              </p>
            </div>
          )}

          {/* Comment Thread */}
          <div className="space-y-3 mb-4">
            <h5 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Comments ({dependency.comments?.length || 0})
            </h5>
            
            {dependency.comments?.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {dependency.comments.map((comment, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg text-sm ${
                      comment.isManagerComment
                        ? 'bg-purple-500/10 border border-purple-500/30'
                        : 'bg-slate-700/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-white">
                        {comment.author?.firstName} {comment.author?.lastName}
                        {comment.isManagerComment && (
                          <span className="ml-2 text-xs text-purple-400">(Manager)</span>
                        )}
                      </span>
                      <span className="text-xs text-slate-500">
                        {formatDate(comment.createdAt)} {formatTime(comment.createdAt)}
                      </span>
                    </div>
                    <p className="text-slate-300">{comment.message}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 italic">No comments yet</p>
            )}

            {/* Add Comment Form */}
            <form onSubmit={handleAddComment} className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 bg-slate-700/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50"
              />
              <Button variant="primary" size="sm" type="submit" disabled={submitting || !newComment.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {/* Responder Actions */}
            {isResponder && dependency.status === 'pending' && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleStatusChange('acknowledged')}
                  disabled={submitting}
                >
                  <CheckCircle className="w-4 h-4" />
                  Acknowledge
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    const reason = prompt('Reason for declining:');
                    if (reason) handleStatusChange('declined', reason);
                  }}
                  disabled={submitting}
                >
                  <XCircle className="w-4 h-4" />
                  Decline
                </Button>
              </>
            )}

            {isResponder && (dependency.status === 'acknowledged' || dependency.status === 'pending') && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleStatusChange('in-progress')}
                disabled={submitting}
              >
                <Clock className="w-4 h-4" />
                Mark In Progress
              </Button>
            )}

            {isResponder && dependency.status === 'in-progress' && (
              <Button
                variant="success"
                size="sm"
                onClick={() => handleStatusChange('fulfilled')}
                disabled={submitting}
              >
                <CheckCircle className="w-4 h-4" />
                Mark Fulfilled
              </Button>
            )}

            {/* Requester Actions */}
            {isRequester && dependency.status !== 'fulfilled' && dependency.status !== 'declined' && (
              <>
                <Button variant="secondary" size="sm" onClick={handleSendReminder}>
                  <Bell className="w-4 h-4" />
                  Remind
                </Button>
                {dependency.status !== 'escalated' && (
                  <Button variant="danger" size="sm" onClick={handleEscalate}>
                    <ArrowUpRight className="w-4 h-4" />
                    Escalate
                  </Button>
                )}
              </>
            )}

            {/* Manager Actions */}
            {isManager && !isRequester && !isResponder && dependency.status !== 'fulfilled' && (
              <Button
                variant="success"
                size="sm"
                onClick={() => handleStatusChange('fulfilled')}
                disabled={submitting}
              >
                <CheckCircle className="w-4 h-4" />
                Resolve
              </Button>
            )}
          </div>

          {/* Meta Info */}
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-4 text-xs text-slate-500">
            <span>Created: {formatDate(dependency.createdAt)}</span>
            {dependency.remindersSent > 0 && (
              <span>Reminders sent: {dependency.remindersSent}</span>
            )}
            {dependency.escalatedAt && (
              <span className="text-purple-400">
                Escalated: {formatDate(dependency.escalatedAt)}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Dependency List Component
export const DependencyList = ({ taskId, dependencies = [], onUpdate, employees, compact = false }) => {
  const { user } = useAuthStore();
  const currentUserId = user?._id;
  const isManager = ['admin', 'chairman', 'manager', 'hr', 'director', 'executive', 'hod', 'teamlead'].includes(user?.role);

  if (!dependencies.length) {
    return (
      <div className="text-center py-8 text-slate-400">
        <Link2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No dependencies yet</p>
        <p className="text-sm">Mark dependencies on others to track blockers</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {dependencies.map((dep) => (
        <DependencyItem
          key={dep.dependencyId || dep._id}
          dependency={dep}
          taskId={taskId}
          currentUserId={currentUserId}
          isManager={isManager}
          onUpdate={onUpdate}
          employees={employees}
          compact={compact}
        />
      ))}
    </div>
  );
};

// Main DependencyManager Component (for task detail page)
const DependencyManager = ({ taskId, dependencies = [], employees = [], onUpdate }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <div className="space-y-4">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Link2 className="w-5 h-5 text-cyan-400" />
          Dependencies ({dependencies.length})
        </h3>
        <Button variant="primary" size="sm" onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4" />
          Mark Dependency
        </Button>
      </div>

      {/* Dependency List */}
      <DependencyList
        taskId={taskId}
        dependencies={dependencies}
        onUpdate={onUpdate}
        employees={employees}
      />

      {/* Create Modal */}
      <CreateDependencyModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        taskId={taskId}
        employees={employees}
        onCreated={onUpdate}
      />
    </div>
  );
};

export default DependencyManager;
