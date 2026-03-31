"use client";

import { useCallback, useEffect, useState } from "react";
import { listTasks, TaskListItem, TaskStatus } from "@/lib/api";
import { UploadForm } from "@/components/upload/UploadForm";
import { TaskList } from "@/components/tasks/TaskList";

export function TaskCenter() {
  const [tasks, setTasks] = useState<TaskListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshTasks = useCallback(async () => {
    const nextTasks = await listTasks();
    setTasks(nextTasks);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      try {
        const nextTasks = await listTasks();
        if (cancelled) return;
        setTasks(nextTasks);
      } finally {
        if (!cancelled) {
          setLoading(false);
          timer = setTimeout(poll, 4000);
        }
      }
    };

    poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  const handleTaskCreated = async (_task: TaskStatus) => {
    await refreshTasks();
  };

  return (
    <div className="space-y-6">
      <UploadForm onTaskCreated={handleTaskCreated} />
      <TaskList tasks={tasks} loading={loading} />
    </div>
  );
}
