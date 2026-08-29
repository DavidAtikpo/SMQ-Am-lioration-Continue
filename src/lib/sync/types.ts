export type SyncResult = {
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
};

export type IndicatorUpsert = {
  id: string;
  source: string;
  category: string;
  label: string;
  value: string;
  numeric?: number | null;
  period?: string;
  detail?: string;
};
