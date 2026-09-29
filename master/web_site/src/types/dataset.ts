/**
 * TypeScript interfaces for the LNP Dataset
 * 
 * These interfaces define the structure of the dataset and column analysis.
 * When integrating with a real database API, these types can be extended
 * to include additional metadata, relationships, and validation schemas.
 */

// Core data structure for a single LNP entry
export interface LNPData {
  lnp_id: string;
  [key: string]: string;
}

// Data fetching state
export interface DatasetState {
  data: LNPData[];
  columns: string[];
  loading: boolean;
  error: string | null;
}

// Statistics for numerical columns
export interface Statistics {
  min: number;
  max: number;
  mean: number;
  median: number;
}

// Histogram bin data
export interface HistogramBin {
  range: string;
  count: number;
}

// Label count for categorical data
export interface LabelCount {
  label: string;
  count: number;
}

// Text/categorical statistics
export interface TextStats {
  uniqueLabels: number;
  labelCounts: LabelCount[];
}

// Pie chart data point
export interface PieChartDataPoint {
  name: string;
  value: number;
  percentage: string;
}

// Complete column analysis result
export interface ColumnAnalysis {
  totalRecords: number;
  validRecords: number;
  nullRecords: number;
  isNumerical: boolean;
  isMolarRatio: boolean;
  isIdentifier: boolean;
  isNucleicAcidSequence: boolean;
  min: number | null;
  max: number | null;
  mean: number | null;
  median: number | null;
  uniqueValues: number;
  sampleValues: string[];
  histogramData: HistogramBin[];
  textStats?: TextStats;
  pieChartData?: PieChartDataPoint[];
  // Nucleic acid sequence normalization
  rawDistribution?: TextStats;
  normalizedDistribution?: TextStats;
}

// Column metadata for categorization
export type ColumnCategory =
  | 'Identifier'
  | 'Lipid Composition'
  | 'Physicochemical Properties'
  | 'Synthesis Parameters'
  | 'Bioactivity Data'
  | 'Publication Info'
  | 'Molecular Structure'
  | 'Other';

// Parsed molar ratio components
export interface MolarRatioComponents {
  ionizable: number[];
  peg: number[];
  sterol: number[];
  helper: number[];
}

// API response wrapper (for future database integration)
export interface DatasetAPIResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    total: number;
    page?: number;
    limit?: number;
    filters?: Record<string, string>;
  };
  error?: string;
}
