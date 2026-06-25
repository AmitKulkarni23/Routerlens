export interface ModelSummary {
  id: string;
  name: string;
  provider: string;
}

export interface ModelsResponse {
  models: ModelSummary[];
  total: number;
  cached_at: string;
}
