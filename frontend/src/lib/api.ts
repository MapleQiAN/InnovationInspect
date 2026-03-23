import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1",
});

export interface TaskStatus {
  task_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  current_step?: string;
  error_message?: string;
}

export interface TaskResults {
  task_id: string;
  status: string;
  essence?: {
    problem: Record<string, unknown>;
    method: Record<string, unknown>;
    architecture: Record<string, unknown>;
    innovation: Record<string, unknown>;
  };
  top_candidates: Array<{
    title: string;
    source: string;
    similarity: number;
  }>;
  report_id?: string;
}

export interface Report {
  id: string;
  task_id: string;
  summary?: string;
  similarity_result: Record<string, unknown>;
  innovation_result: Record<string, unknown>;
  conclusion?: string;
  reviewer_comment?: string;
}

export const submitTask = async (files: File[]): Promise<TaskStatus> => {
  const formData = new FormData();
  files.forEach((f) => formData.append("files", f));
  const res = await api.post<TaskStatus>("/tasks/", formData);
  return res.data;
};

export const getTaskStatus = async (taskId: string): Promise<TaskStatus> => {
  const res = await api.get<TaskStatus>(`/tasks/${taskId}`);
  return res.data;
};

export const getTaskResults = async (taskId: string): Promise<TaskResults> => {
  const res = await api.get<TaskResults>(`/tasks/${taskId}/results`);
  return res.data;
};

export const getReport = async (reportId: string): Promise<Report> => {
  const res = await api.get<Report>(`/reports/${reportId}`);
  return res.data;
};

export const addReviewComment = async (
  reportId: string,
  comment: string
): Promise<void> => {
  await api.post(`/reports/${reportId}/review`, { comment });
};

// ---- OpenClaw Skills ----

export interface SkillMeta {
  name: string;
  description: string;
  skill_type: "basic" | "core";
  input_schema: Record<string, unknown>;
}

export interface SkillExecuteResponse {
  skill_name: string;
  success: boolean;
  data: unknown;
  error: string | null;
  duration_ms: number;
}

export const listSkills = async (): Promise<SkillMeta[]> => {
  const res = await api.get<SkillMeta[]>("/skills/");
  return res.data;
};

export const getSkill = async (name: string): Promise<SkillMeta> => {
  const res = await api.get<SkillMeta>(`/skills/${name}`);
  return res.data;
};

export const executeSkill = async (
  name: string,
  inputs: Record<string, unknown>
): Promise<SkillExecuteResponse> => {
  const res = await api.post<SkillExecuteResponse>(
    `/skills/${name}/execute`,
    { inputs }
  );
  return res.data;
};
