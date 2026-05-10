import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import TaskCard from './TaskCard';

export default function KanbanColumn({ id, title, tasks }) {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div className="flex flex-col w-full min-w-[280px] bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden h-full">
      <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
        <h3 className="text-sm font-semibold text-gray-300 flex items-center">
          {title}
          <span className="ml-2 px-2 py-0.5 text-[10px] bg-white/10 text-gray-400 rounded-full">
            {tasks.length}
          </span>
        </h3>
      </div>

      <div
        ref={setNodeRef}
        className="flex-1 p-3 overflow-y-auto min-h-[150px]"
      >
        <SortableContext
          id={id}
          items={tasks.map(t => t.taskId)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <TaskCard key={task.taskId} task={task} />
          ))}
          {tasks.length === 0 && (
            <div className="h-full flex items-center justify-center border-2 border-dashed border-white/5 rounded-xl py-8">
              <p className="text-xs text-gray-600 uppercase tracking-widest font-medium">Empty</p>
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  );
}
