export type TaskSource = "Workana" | "99Freelas" | "Upwork" | "Freelancer" | "LinkedIn" | "Community" | "Referral" | "Manual";
export type TaskCategory = "Proposal" | "Discovery" | "Landing Page" | "Dashboard" | "Automation" | "AI Workflow" | "CRM" | "Data Organization" | "Consulting" | "Delivery" | "Follow-up" | "Other";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type TaskOwner = "Junior Sena" | "GXEON Operator" | "Codex" | "Copilot" | "Manual Review";
export type TaskStatus = "BACKLOG" | "TRIAGE" | "IN_PROGRESS" | "WAITING_CLIENT" | "REVIEW" | "DONE" | "ARCHIVED";

export type TaskQueueItem = {
  id: string;
  opportunity_id?: string;
  title: string;
  client_label: string;
  source: TaskSource;
  category: TaskCategory;
  estimated_value_brl: number;
  priority: TaskPriority;
  owner: TaskOwner;
  status: TaskStatus;
  progress_percent: number;
  due_label: string;
  next_action: string;
  evidence?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  data_mode: "real";
};

export type TaskQueueSummary = {
  open_tasks: number;
  critical_tasks: number;
  in_progress_tasks: number;
  done_tasks: number;
  potential_value_brl: number;
  average_progress: number;
};

export const taskPipelineStatuses: TaskStatus[] = [
  "BACKLOG",
  "TRIAGE",
  "IN_PROGRESS",
  "WAITING_CLIENT",
  "REVIEW",
  "DONE",
  "ARCHIVED",
];

export const taskBoardStatuses: TaskStatus[] = ["BACKLOG", "TRIAGE", "IN_PROGRESS", "WAITING_CLIENT", "REVIEW", "DONE"];
export const activeTaskStatuses: TaskStatus[] = ["BACKLOG", "TRIAGE", "IN_PROGRESS", "WAITING_CLIENT", "REVIEW"];

export const realOperationalTasks: TaskQueueItem[] = [];

export const activeOperationalTasks: TaskQueueItem[] = [];

export function getTaskStatusCounts(tasks: TaskQueueItem[] = activeOperationalTasks) {
  return taskPipelineStatuses.map((status) => ({
    status,
    count: tasks.filter((task) => task.status === status).length,
    estimatedValueBrl: tasks
      .filter((task) => task.status === status)
      .reduce((total, task) => total + task.estimated_value_brl, 0),
  }));
}

export function getTasksByStatus(status: TaskStatus, tasks: TaskQueueItem[] = activeOperationalTasks) {
  return tasks.filter((task) => task.status === status);
}

export function getActiveTaskValue(tasks: TaskQueueItem[] = activeOperationalTasks) {
  return tasks
    .filter((task) => activeTaskStatuses.includes(task.status))
    .reduce((total, task) => total + task.estimated_value_brl, 0);
}

export function getCriticalTasks(tasks: TaskQueueItem[] = activeOperationalTasks) {
  return tasks.filter((task) => task.priority === "CRITICAL" && task.status !== "DONE" && task.status !== "ARCHIVED");
}

export function getAverageTaskProgress(tasks: TaskQueueItem[] = activeOperationalTasks) {
  if (tasks.length === 0) return 0;
  return Math.round(tasks.reduce((total, task) => total + task.progress_percent, 0) / tasks.length);
}

export function getTaskQueueSummary(tasks: TaskQueueItem[] = activeOperationalTasks): TaskQueueSummary {
  return {
    open_tasks: tasks.filter((task) => activeTaskStatuses.includes(task.status)).length,
    critical_tasks: getCriticalTasks(tasks).length,
    in_progress_tasks: tasks.filter((task) => task.status === "IN_PROGRESS").length,
    done_tasks: tasks.filter((task) => task.status === "DONE").length,
    potential_value_brl: getActiveTaskValue(tasks),
    average_progress: getAverageTaskProgress(tasks),
  };
}
