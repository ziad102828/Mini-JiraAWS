import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { X, MessageSquare, History, Send, Loader2, Clock, CheckCircle2, User } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function TaskDetailModal({ isOpen, onClose, task }) {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('comments'); // 'comments' or 'history'
  const [newComment, setNewComment] = useState('');

  // Fetch Comments
  const { data: commentsData, isLoading: loadingComments } = useQuery({
    queryKey: ['comments', task?.taskId],
    queryFn: () => api.getComments(token, task?.taskId),
    enabled: isOpen && !!task?.taskId && activeTab === 'comments'
  });

  // Fetch Audit Log
  const { data: auditData, isLoading: loadingAudit } = useQuery({
    queryKey: ['audit', task?.taskId],
    queryFn: () => api.getAuditLog(token, task?.taskId),
    enabled: isOpen && !!task?.taskId && activeTab === 'history'
  });

  const commentMutation = useMutation({
    mutationFn: (content) => api.createComment(token, task.taskId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', task.taskId] });
      setNewComment('');
    }
  });

  if (!isOpen || !task) return null;

  const handlePostComment = (e) => {
    e.preventDefault();
    if (newComment.trim()) {
      commentMutation.mutate(newComment);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'medium': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusDisplay = (status) => {
    switch(status) {
      case 'todo': return 'To Do';
      case 'in_progress': return 'In Progress';
      case 'in_review': return 'In Review';
      case 'done': return 'Done';
      default: return status;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#11111a] border border-white/10 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
        
        {/* Header Section */}
        <div className="p-6 border-b border-white/5 flex-shrink-0">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">{task.title}</h2>
              <div className="flex flex-wrap gap-2 text-xs font-medium">
                <span className={`px-2.5 py-1 rounded-md border ${getPriorityColor(task.priority)} uppercase tracking-wider`}>
                  {task.priority}
                </span>
                <span className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-gray-300 capitalize">
                  {getStatusDisplay(task.status)}
                </span>
                <span className="px-2.5 py-1 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-400">
                  Team: {task.teamId}
                </span>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5">
              <X size={20} />
            </button>
          </div>
          
          <div className="text-sm text-gray-400 bg-white/5 p-4 rounded-xl border border-white/5">
            <p className="whitespace-pre-wrap">{task.description || "No description provided."}</p>
          </div>

          <div className="flex items-center gap-6 mt-4 text-sm text-gray-400">
            <div className="flex items-center">
              <User size={14} className="mr-1.5 text-blue-400" />
              <span>Assigned: {task.assigneeId || 'Unassigned'}</span>
            </div>
            {task.deadline && (
              <div className="flex items-center">
                <Clock size={14} className="mr-1.5 text-red-400" />
                <span>Due: {format(parseISO(task.deadline), 'MMM d, yyyy')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/5 flex-shrink-0">
          <button 
            onClick={() => setActiveTab('comments')}
            className={`flex items-center px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'comments' ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-400/5' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            }`}
          >
            <MessageSquare size={16} className="mr-2" /> Comments
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex items-center px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'history' ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-400/5' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            }`}
          >
            <History size={16} className="mr-2" /> Audit Log
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-black/20">
          
          {/* Comments Tab */}
          {activeTab === 'comments' && (
            <div className="space-y-4">
              {loadingComments ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin text-blue-500" size={24} /></div>
              ) : commentsData?.comments?.length === 0 ? (
                <p className="text-center text-gray-500 py-8 italic">No comments yet. Be the first to start the discussion!</p>
              ) : (
                commentsData?.comments?.map(comment => (
                  <div key={comment.commentId} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {comment.authorId.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-none p-4 flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-semibold text-sm text-gray-200">{comment.authorId}</span>
                        <span className="text-xs text-gray-500">
                          {format(parseISO(comment.createdAt), 'MMM d, h:mm a')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-300 whitespace-pre-wrap">{comment.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Audit Log Tab */}
          {activeTab === 'history' && (
            <div className="space-y-0 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
              {loadingAudit ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin text-blue-500" size={24} /></div>
              ) : auditData?.auditLog?.length === 0 ? (
                <p className="text-center text-gray-500 py-8 italic relative z-10">No status changes recorded yet.</p>
              ) : (
                auditData?.auditLog?.map((log, idx) => (
                  <div key={log.auditId || idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active py-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white/10 bg-[#11111a] text-gray-400 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow">
                      <CheckCircle2 size={16} className={log.toStatus === 'done' ? 'text-green-500' : 'text-blue-500'} />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-white/5 bg-white/5 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm text-gray-200">{log.actorId}</span>
                        <span className="text-xs text-gray-500">{format(parseISO(log.changedAt), 'MMM d, h:mm a')}</span>
                      </div>
                      <p className="text-sm text-gray-400">
                        Moved from <span className="font-semibold text-gray-300">{getStatusDisplay(log.fromStatus)}</span> to <span className="font-semibold text-gray-300">{getStatusDisplay(log.toStatus)}</span>
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Comment Input Area */}
        {activeTab === 'comments' && (
          <div className="p-4 border-t border-white/5 bg-[#0a0a0e] flex-shrink-0">
            <form onSubmit={handlePostComment} className="flex gap-3">
              <input
                type="text"
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
              <button 
                type="submit"
                disabled={!newComment.trim() || commentMutation.isPending}
                className="bg-blue-600 hover:bg-blue-500 text-white p-2.5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center w-12 shrink-0"
              >
                {commentMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
