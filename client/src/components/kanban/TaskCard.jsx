import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, User, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';

export default function TaskCard({ task, onClick }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.taskId });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  const priorityColors = {
    low: 'bg-green-500/10 text-green-500',
    medium: 'bg-yellow-500/10 text-yellow-500',
    high: 'bg-red-500/10 text-red-500',
    critical: 'bg-purple-500/10 text-purple-500'
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => {
        if (!isDragging && onClick) onClick(task);
      }}
      className="bg-white/5 border border-white/10 p-4 rounded-xl mb-3 cursor-grab active:cursor-grabbing hover:border-white/20 transition-colors group"
    >
      <div className="flex justify-between items-start mb-3">
        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${priorityColors[task.priority] || priorityColors.medium}`}>
          {task.priority}
        </span>
        <span className="text-[10px] text-gray-500 font-mono">#{task.taskId.slice(-4)}</span>
      </div>
      
      <h4 className="text-sm font-medium text-gray-100 mb-3 group-hover:text-blue-400 transition-colors line-clamp-2">
        {task.title}
      </h4>

      <div className="flex flex-wrap gap-3 mt-auto">
        {task.deadline && (
          <div className="flex items-center text-[11px] text-gray-400">
            <Calendar size={12} className="mr-1" />
            {format(new Date(task.deadline), 'MMM dd')}
          </div>
        )}
        
        <div className="flex items-center text-[11px] text-gray-400">
          <User size={12} className="mr-1" />
          <span className="truncate max-w-[80px]">{task.assigneeName || 'Unassigned'}</span>
        </div>

        {task.commentCount > 0 && (
          <div className="flex items-center text-[11px] text-blue-400">
            <MessageSquare size={12} className="mr-1" />
            {task.commentCount}
          </div>
        )}
      </div>
    </div>
  );
}
