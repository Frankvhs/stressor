import { K6OutputSanitizer } from "../sanitizer";

export interface K6Metric {
  type: 'Metric';
  data: {
    name: string;
    type: 'gauge' | 'counter' | 'trend' | 'rate';
    contains: 'default' | 'time' | 'data';
    thresholds: any[];
    submetrics: any[] | null;
  };
  metric: string;
}

export interface K6Point {
  metric: string;
  type: 'Point';
  data: {
    time: string;
    value: number;
    tags: Record<string, string>;
  };
}

export type K6Output = K6Metric | K6Point;

export interface MetricReport {
  name: string;
  type: string;
  description: string;
  unit?: string;
  points: Array<{
    time: string;
    value: number;
    tags: Record<string, string>;
    timestamp?: Date;
  }>;
  summary?: {
    count: number;
    avg: number;
    min: number;
    max: number;
  };
}

export type LoadAdapterReport = MetricReport[];