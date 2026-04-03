import { useCRMTasks } from '../hooks/useCRMTasks';
import { Link } from 'react-router-dom';
import { CheckSquare } from 'lucide-react';

export function CRMTasksWidget() {
  const { tasks, loading, completeTask } = useCRMTasks();
  const overdue = tasks.filter(t => new Date(t.due_at) < new Date());
  const upcoming = tasks.filter(t => new Date(t.due_at) >= new Date()).slice(0, 5);

  if (loading) return <div className="h-32 bg-muted/30 rounded-xl animate-pulse" />;

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-foreground">
          <CheckSquare size={16} />
          <span className="text-sm font-semibold">Follow-ups</span>
        </div>
        <Link to="/dashboard/crm" className="text-xs text-primary hover:underline">
          View all →
        </Link>
      </div>

      {overdue.length > 0 && (
        <div className="mb-3 space-y-1.5">
          <p className="text-xs font-semibold text-destructive">
            {overdue.length} Overdue
          </p>
          {overdue.slice(0, 3).map(task => (
            <div key={task.id} className="flex items-center gap-2 text-xs">
              <button
                onClick={() => completeTask(task.id)}
                className="w-4 h-4 rounded border border-destructive/30 hover:bg-destructive/10 flex-shrink-0"
              />
              <span className="text-foreground truncate">{task.title}</span>
            </div>
          ))}
        </div>
      )}

      {upcoming.length === 0 && overdue.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">All caught up! 🎉</p>
      )}

      <div className="space-y-1.5">
        {upcoming.map(task => (
          <div key={task.id} className="flex items-center gap-2 text-xs">
            <button
              onClick={() => completeTask(task.id)}
              className="w-4 h-4 rounded border border-muted-foreground/30 hover:border-primary
                         hover:bg-primary/10 flex-shrink-0 transition"
            />
            <span className="text-foreground truncate flex-1">{task.title}</span>
            <span className="text-muted-foreground flex-shrink-0">
              {new Date(task.due_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
