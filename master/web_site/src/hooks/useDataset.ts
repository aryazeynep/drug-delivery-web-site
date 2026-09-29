/**
 * Custom React hook for dataset management
 * 
 * This hook handles CSV parsing and data state management.
 * 
 * FUTURE DATABASE INTEGRATION:
 * ============================
 * When connecting to a real database API, replace the CSV fetching logic in this hook:
 * 
 * 1. Replace `fetch('/lnp_atlas.csv')` with your API endpoint:
 *    ```typescript
 *    const response = await fetch('/api/datasets/lnp-atlas');
 *    const result = await response.json();
 *    return { data: result.data, columns: result.columns };
 *    ```
 * 
 * 2. For pagination support:
 *    ```typescript
 *    const response = await fetch(`/api/datasets/lnp-atlas?page=${page}&limit=${limit}`);
 *    ```
 * 
 * 3. For filtering:
 *    ```typescript
 *    const response = await fetch(`/api/datasets/lnp-atlas?filter=${JSON.stringify(filters)}`);
 *    ```
 * 
 * 4. For streaming/big data:
 *    ```typescript
 *    // Use cursor-based pagination
 *    const response = await fetch(`/api/datasets/lnp-atlas?cursor=${cursor}`);
 *    ```
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Papa from 'papaparse';
import type { LNPData, DatasetState, Statistics, HistogramBin, ColumnAnalysis, TextStats, PieChartDataPoint } from '@/types/dataset';

const MORTAL_RATIO_NAMES = ['Ionizable Lipid', 'PEG Lipid', 'Sterol Lipid', 'Helper Lipid'];

// Loading capacity metric types
export type LoadingCapacityMetricType = 'CONC' | 'NP' | 'WR' | 'OTHER' | 'MIXED' | 'UNKNOWN';

export interface ParsedLoadingCapacity {
  metricType: LoadingCapacityMetricType;
  numericValue: number | null;
  rawValue: string;
}

// Regex patterns for loading capacity parsing
const LOADING_PATTERNS = {
  // CONC:0.1(??g/??L)[mRNA], CONC:0.27(mg/mL)[pDNA]
  conc: /^CONC:([\d.]+)/i,
  // NP:6(molar), NP:fixed(molar)
  np: /^NP:([\d.]+|fixed)/i,
  // WR:10(wt/wt)[lipid:mRNA]
  wr: /^WR:([\d.]+)/i,
  // OTHER:text
  other: /^OTHER:/i,
};

/**
 * Parse loading capacity string to extract metric type and numeric value
 * Only extracts numeric values from clearly structured patterns (CONC:, NP:, WR:)
 * Returns null for OTHER, MIXED, or UNKNOWN to avoid false positives
 */
function parseLoadingCapacity(value: string): ParsedLoadingCapacity {
  if (!value || typeof value !== 'string' || !value.trim()) {
    return { metricType: 'UNKNOWN', numericValue: null, rawValue: value || '' };
  }

  const cleaned = value.trim();
  
  // Try to extract CONC value (e.g., CONC:0.1(??g/??L)[mRNA])
  const concMatch = cleaned.match(LOADING_PATTERNS.conc);
  if (concMatch) {
    const numValue = parseFloat(concMatch[1]);
    return {
      metricType: 'CONC',
      numericValue: isNaN(numValue) ? null : numValue,
      rawValue: cleaned,
    };
  }
  
  // Try to extract NP value (e.g., NP:6(molar), NP:fixed(molar))
  const npMatch = cleaned.match(LOADING_PATTERNS.np);
  if (npMatch) {
    const numStr = npMatch[1];
    const numValue = numStr === 'fixed' ? null : parseFloat(numStr);
    return {
      metricType: 'NP',
      numericValue: isNaN(numValue as number) ? null : numValue,
      rawValue: cleaned,
    };
  }
  
  // Try to extract WR value (e.g., WR:10(wt/wt)[lipid:mRNA])
  const wrMatch = cleaned.match(LOADING_PATTERNS.wr);
  if (wrMatch) {
    const numValue = parseFloat(wrMatch[1]);
    return {
      metricType: 'WR',
      numericValue: isNaN(numValue) ? null : numValue,
      rawValue: cleaned,
    };
  }
  
  // Check if OTHER type - DO NOT extract arbitrary numbers to avoid false positives
  if (LOADING_PATTERNS.other.test(cleaned)) {
    return {
      metricType: 'OTHER',
      numericValue: null,
      rawValue: cleaned,
    };
  }
  
  // Check for mixed patterns (contains multiple metric types)
  const hasMultiple = (
    (cleaned.match(/CONC:/i) ? 1 : 0) +
    (cleaned.match(/NP:/i) ? 1 : 0) +
    (cleaned.match(/WR:/i) ? 1 : 0)
  ) > 1;
  
  if (hasMultiple) {
    return {
      metricType: 'MIXED',
      numericValue: null,
      rawValue: cleaned,
    };
  }
  
  // Fallback: unknown format - no numeric extraction to avoid false positives
  return {
    metricType: 'UNKNOWN',
    numericValue: null,
    rawValue: cleaned,
  };
}

/**
 * Parse all loading capacity values and return grouped statistics
 */
function parseLoadingCapacities(values: string[]): {
  parsed: ParsedLoadingCapacity[];
  metricTypeCounts: Record<LoadingCapacityMetricType, number>;
  wrValues: number[];
  npValues: number[];
  concValues: number[];
} {
  const parsed = values.map(parseLoadingCapacity);
  
  const metricTypeCounts: Record<LoadingCapacityMetricType, number> = {
    CONC: 0,
    NP: 0,
    WR: 0,
    OTHER: 0,
    MIXED: 0,
    UNKNOWN: 0,
  };
  
  const wrValues: number[] = [];
  const npValues: number[] = [];
  const concValues: number[] = [];
  
  parsed.forEach((p) => {
    metricTypeCounts[p.metricType]++;
    if (p.metricType === 'WR' && p.numericValue !== null) {
      wrValues.push(p.numericValue);
    } else if (p.metricType === 'NP' && p.numericValue !== null) {
      npValues.push(p.numericValue);
    } else if (p.metricType === 'CONC' && p.numericValue !== null) {
      concValues.push(p.numericValue);
    }
  });
  
  return { parsed, metricTypeCounts, wrValues, npValues, concValues };
}

/**
 * Main hook for fetching and managing dataset
 * 
 * @param csvPath - Path to the CSV file (can be replaced with API endpoint)
 * @returns DatasetState and data manipulation utilities
 */
export function useDataset(csvPath: string = '/lnp_atlas.csv') {
  const [state, setState] = useState<DatasetState>({
    data: [],
    columns: [],
    loading: true,
    error: null,
  });

  // Fetch data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(csvPath);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const csvText = await response.text();
        
        Papa.parse<LNPData>(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            if (results.data.length > 0) {
              setState({
                data: results.data,
                columns: results.meta.fields || [],
                loading: false,
                error: null,
              });
            } else {
              setState({
                data: [],
                columns: [],
                loading: false,
                error: 'No data found in CSV',
              });
            }
          },
          error: (err: Error) => {
            setState({
              data: [],
              columns: [],
              loading: false,
              error: err.message,
            });
          },
        });
      } catch (err) {
        setState({
          data: [],
          columns: [],
          loading: false,
          error: err instanceof Error ? err.message : 'Unknown error occurred',
        });
      }
    };

    fetchData();
  }, [csvPath]);

  return state;
}

/**
 * Hook for column analysis utilities
 */
export function useColumnAnalysis(data: LNPData[], columns: string[]) {
  // Normalize nucleic acid sequence values via strict synonym/alias resolution
  // No artificial categorization - only canonical naming for known aliases

  // Known alias map: lowercase key -> canonical display name (defined at outer scope)
  const aliasMap: Record<string, string> = {
    // Luciferase family - NOTE: unspecified "luciferase" maps to Firefly (standard in LNP assays)
    'firefly_luciferase': 'Firefly Luciferase',
    'fluc': 'Firefly Luciferase',
    'firefly luciferase': 'Firefly Luciferase',
    'luciferase': 'Firefly Luciferase',  // Generic luciferase = Firefly in LNP context
    'nanoluciferase': 'NanoLuciferase',
    'nluc': 'NanoLuciferase',
    'nano-luciferase': 'NanoLuciferase',
    'renilla': 'Renilla Luciferase',
    'renilla_luciferase': 'Renilla Luciferase',
    // Other targets
    'epo': 'EPO',
    'erythropoietin': 'EPO',
    'factor_vii': 'Factor VII',
    'fvii': 'Factor VII',
    'factor vii': 'Factor VII',
    'cas9': 'Cas9',
    'crispr': 'Cas9',
    'cre': 'Cre Recombinase',
    'cre_recombinase': 'Cre Recombinase',
    'egfp': 'GFP (Reporter)',
    'gfp': 'GFP (Reporter)',
    'mcherry': 'mCherry',
    'apob': 'ApoB',
    'sars_cov2': 'SARS-CoV-2 Spike (BNT162b2)',
    'bnt162b2': 'SARS-CoV-2 Spike (BNT162b2)',
    'sars-cov-2 spike': 'SARS-CoV-2 Spike (BNT162b2)',
    'spike': 'SARS-CoV-2 Spike (BNT162b2)',
    'empty': 'Empty LNP',
    'not_specified': 'Empty LNP',
    'none': 'Empty LNP',
    'n/a': 'Empty LNP',
    'sirna': 'siRNA',
    'aso': 'ASO',
    'antisense': 'ASO',
  };

  // Clean a label: replace underscores with spaces, preserve abbreviations and structure
  const cleanLabel = (label: string): string => {
    return label
      .replace(/_/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Helper: normalize a single target string to canonical name
  const normalizeSingleTarget = (v: string, lowerV: string): string => {
    // Check alias map first
    if (aliasMap[lowerV]) {
      return aliasMap[lowerV];
    }

    // Check if the whole string starts with a known target (before sequence data)
    const targetMatch = lowerV.match(/^([a-z0-9_]+)/);
    if (targetMatch && aliasMap[targetMatch[1]]) {
      return aliasMap[targetMatch[1]];
    }

    // Default: clean the label preserving structure
    return cleanLabel(v);
  };

  const normalizeNucleicAcid = useCallback((value: string): string => {
    if (!value || typeof value !== 'string') return '';

    const v = value.trim();
    const lowerV = v.toLowerCase();

    // ============================================================
    // STEP 1: Handle special embedded formats first
    // ============================================================

    // Extract target from ASO/siRNA format: "aso(gfp, 5'-...)" or "siRNA:gfp"
    const asoMatch = lowerV.match(/^(?:aso| sirna)?\(?([^,)]+)/);
    if (asoMatch) {
      const target = asoMatch[1].trim();
      // Check if it's targeting GFP
      if (target.includes('gfp')) {
        // ASO/siRNA targeting GFP sequence
        return 'GFP (siRNA/ASO Target)';
      }
      // ASO/siRNA targeting another gene - extract the gene name
      const targetAlias = aliasMap[target] || cleanLabel(target);
      return targetAlias;
    }

    // Extract target from barcode format: "barcode(...)" or "barcode_..."
    const barcodeMatch = lowerV.match(/^(?:barcode)[\s_(]*\(*([^,)]*)/);
    if (barcodeMatch && !lowerV.includes('gfp') && !lowerV.includes('aso')) {
      // Generic cell barcode / library tag
      return 'Cell Barcode / Library Tag';
    }

    // ============================================================
    // STEP 2: Extract GFP from complex strings like "gfp, plasmid" or "egfp"
    // ============================================================
    if (lowerV.includes('gfp') || lowerV.includes('egfp')) {
      // Check context: plasmid/reporter vs ASO/siRNA target
      if (lowerV.includes('plasmid') || lowerV.includes('mrna') || lowerV.includes('reporter') ||
          lowerV === 'gfp' || lowerV === 'egfp' || lowerV === 'gfp,' || lowerV === 'egfp,') {
        return 'GFP (Reporter)';
      }
      if (lowerV.includes('sirna') || lowerV.includes('aso')) {
        return 'GFP (siRNA/ASO Target)';
      }
      // Any other GFP context = reporter
      return 'GFP (Reporter)';
    }

    // ============================================================
    // STEP 3: Multi-target detection (comma, semicolon, plus)
    // ============================================================
    const delimiterRegex = /[,;\/&+]|\band\b/;
    if (delimiterRegex.test(v)) {
      const parts = v.split(delimiterRegex).map((part) => part.trim()).filter((p) => p);

      if (parts.length > 1) {
        const normalizedParts = parts.map((part) => {
          const lowerPart = part.toLowerCase();
          // Normalize each part
          return normalizeSingleTarget(part, lowerPart);
        });
        return normalizedParts.join(' + ');
      }
    }

    // ============================================================
    // STEP 4: Single target canonicalization
    // ============================================================
    return normalizeSingleTarget(v, lowerV);
  }, []);

  // Parse a numeric value from a string that may contain leading quotes, tildes, ranges, or plus-minus symbols

  // Parse a numeric value from a string that may contain leading quotes, tildes, ranges, or plus-minus symbols
  const parseNumericValue = useCallback((value: string): number | null => {
    if (!value || typeof value !== 'string') return null;
    
    let cleaned = value.trim();
    
    // Strip leading/trailing quotes and tildes
    cleaned = cleaned.replace(/^['"~]+|['"~]+$/g, '');
    cleaned = cleaned.trim();
    
    if (!cleaned) return null;
    
    // Handle plus-minus/± symbols (including corrupted encoding like ¡¾)
    // Extract the value BEFORE the ± symbol
    const pmMatch = cleaned.match(/^(-?[\d.]+)\s*(?:±|¡¾|\+\/-|\+\-)/);
    if (pmMatch) {
      const num = parseFloat(pmMatch[1]);
      return isNaN(num) ? null : num;
    }
    
    // Handle ranges like "-5 to -10" or "~-5 to -10" - take the first value
    const rangeMatch = cleaned.match(/^(-?[\d.]+)\s*(?:to|-)\s*-?[\d.]+/);
    if (rangeMatch) {
      const num = parseFloat(rangeMatch[1]);
      return isNaN(num) ? null : num;
    }
    
    // Standard float parsing (supports negative numbers)
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }, []);

  // Parse a percentage value from a string (for encapsulation efficiency)
  // Handles: "88%", "95.4 ± 4.9%", ">90%", "~85", "80-90%", "80 to 90", corrupted encodings
  const parsePercentageValue = useCallback((value: string): number | null => {
    if (!value || typeof value !== 'string') return null;
    
    let cleaned = value.trim();
    
    // Strip common symbols: >, <, ~, %, ', ", whitespace
    cleaned = cleaned.replace(/^[<>~%'"]+|[<>~%'"]+$/g, '');
    cleaned = cleaned.trim();
    
    if (!cleaned) return null;
    
    // Handle plus-minus/± symbols (including corrupted encoding like ¡¾)
    // Extract the value BEFORE the ± symbol
    const pmMatch = cleaned.match(/^(-?[\d.]+)\s*(?:±|¡¾|\+\/-|\+\-)/);
    if (pmMatch) {
      const num = parseFloat(pmMatch[1]);
      if (isNaN(num) || num < 0 || num > 105) return null;
      return Math.min(num, 100); // Clamp values between 0-100 (or up to 105 for calibration noise)
    }
    
    // Handle ranges like "80-90" or "80 to 90" - take the midpoint
    const rangeMatch = cleaned.match(/^(-?[\d.]+)\s*(?:to|-)\s*(-?[\d.]+)/);
    if (rangeMatch) {
      const num1 = parseFloat(rangeMatch[1]);
      const num2 = parseFloat(rangeMatch[2]);
      if (isNaN(num1) || isNaN(num2)) return null;
      const midpoint = (num1 + num2) / 2;
      if (midpoint < 0 || midpoint > 105) return null;
      return Math.min(midpoint, 100);
    }
    
    // Standard float parsing with validation
    const num = parseFloat(cleaned);
    if (isNaN(num) || num < 0 || num > 105) return null;
    return Math.min(num, 100); // Clamp calibration noise to 100
  }, []);

  // Parse molar ratios into individual component arrays
  const parseMolarRatios = useCallback((values: string[]): number[][] => {
    const parsed: number[][] = [[], [], [], []];
    values.forEach((v) => {
      if (v && v.trim()) {
        const parts = v.split(':').map((p) => parseNumericValue(p.trim()));
        if (parts.length === 4 && parts.every((p) => p !== null && !isNaN(p))) {
          parts.forEach((p, i) => parsed[i].push(p as number));
        }
      }
    });
    return parsed;
  }, [parseNumericValue]);

  // Calculate basic statistics for numerical data
  const calculateStatistics = useCallback((values: number[]): Statistics => {
    if (values.length === 0) {
      return { min: 0, max: 0, mean: 0, median: 0 };
    }
    const sorted = [...values].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    return { min, max, mean, median };
  }, []);

  // Create histogram bins from numerical values
  const createHistogramData = useCallback((values: number[]): HistogramBin[] => {
    if (values.length === 0) return [];
    
    const min = Math.min(...values);
    const max = Math.max(...values);
    const binCount = Math.min(10, Math.ceil(Math.sqrt(values.length)));
    const binWidth = (max - min) / binCount || 1;
    
    // Determine decimal places based on bin width for better readability
    // If bin width < 1, use 2 decimal places; otherwise use 1
    const decimals = binWidth < 1 ? 2 : 1;
    
    const bins: HistogramBin[] = [];
    
    for (let i = 0; i < binCount; i++) {
      const binStart = min + i * binWidth;
      const binEnd = binStart + binWidth;
      bins.push({
        range: `${binStart.toFixed(decimals)}-${binEnd.toFixed(decimals)}`,
        count: values.filter((v) => v >= binStart && (i === binCount - 1 ? v <= binEnd : v < binEnd)).length,
      });
    }
    return bins;
  }, []);

  // Create histogram bins for percentage values with clean 10% intervals (0-10, 10-20, ..., 90-100)
  const createPercentageHistogramData = useCallback((values: number[]): HistogramBin[] => {
    if (values.length === 0) return [];
    
    // Filter to valid percentage range (0-100)
    const validValues = values.filter((v) => v >= 0 && v <= 100);
    if (validValues.length === 0) return [];
    
    const bins: HistogramBin[] = [];
    
    // Create 10 bins: 0-10, 10-20, ..., 90-100
    for (let i = 0; i < 10; i++) {
      const binStart = i * 10;
      const binEnd = (i + 1) * 10;
      const count = validValues.filter((v) => v >= binStart && (i === 9 ? v <= binEnd : v < binEnd)).length;
      bins.push({
        range: `${binStart}-${binEnd}`,
        count,
      });
    }
    return bins;
  }, []);

  // Check if column is numerical
  const isColumnNumerical = useCallback((column: string): boolean => {
    const numericalColumns = [
      'particle_size_nm_std', 'pdi_std', 'zeta_potential_mv_std',
      'encapsulation_efficiency_percent_std', 'loading_capacity_std', 'lnp_id'
    ];
    return numericalColumns.includes(column) || column === 'lipid_molar_ratio';
  }, []);

  // Check if column is text/categorical
  const isTextColumn = useCallback((column: string): boolean => {
    const textColumns = [
      'synthesis_info', 'bioactivity_profile', 'ionizable_lipid_smiles',
      'peg_lipid_smiles', 'sterol_lipid_smiles', 'helper_lipid_smiles',
      'paper_title', 'paper_authors', 'paper_doi', 'paper_journal'
    ];
    return textColumns.includes(column) || column.includes('smiles');
  }, []);

  // Check if column is an identifier
  const isIdentifierColumn = useCallback((column: string): boolean => {
    const lowerCol = column.toLowerCase();
    const idKeywords = ['_id', 'lnp_id'];
    return idKeywords.some(k => lowerCol === k || lowerCol.includes(k));
  }, []);

  // Get unique count for a column
  const getUniqueCount = useCallback((column: string): number => {
    const values = data.map((row) => row[column]).filter((v) => v && v.trim() !== '');
    return new Set(values).size;
  }, [data]);

  // Get category for a column
  const getColumnCategory = useCallback((column: string): string => {
    const lipidKeywords = ['lipid', 'cholesterol', 'dspe', 'dope', 'peg', 'ionizable'];
    const propertyKeywords = ['size', 'pdi', 'zeta', 'potential', 'efficiency', 'encapsulation', 'loading'];
    const synthesisKeywords = ['synthesis', 'device', 'flow', 'temperature', 'mixing'];
    const bioKeywords = ['bioactivity', 'animal', 'administration', 'dose', 'biodistribution'];
    const paperKeywords = ['paper', 'doi', 'journal', 'author', 'year'];
    const structureKeywords = ['smiles', 'sequence'];

    const lowerCol = column.toLowerCase();
    if (lowerCol === 'lnp_id') return 'Identifier';
    if (lowerCol.includes('id')) return 'Identifier';
    if (lipidKeywords.some((k) => lowerCol.includes(k))) return 'Lipid Composition';
    if (propertyKeywords.some((k) => lowerCol.includes(k))) return 'Physicochemical Properties';
    if (synthesisKeywords.some((k) => lowerCol.includes(k))) return 'Synthesis Parameters';
    if (bioKeywords.some((k) => lowerCol.includes(k))) return 'Bioactivity Data';
    if (paperKeywords.some((k) => lowerCol.includes(k))) return 'Publication Info';
    if (structureKeywords.some((k) => lowerCol.includes(k))) return 'Molecular Structure';
    return 'Other';
  }, []);

  // Get category badge color
  const getCategoryColor = useCallback((category: string): string => {
    const colors: Record<string, string> = {
      'Identifier': 'bg-gray-100 text-gray-700 border-gray-300',
      'Lipid Composition': 'bg-blue-100 text-blue-700 border-blue-300',
      'Physicochemical Properties': 'bg-green-100 text-green-700 border-green-300',
      'Synthesis Parameters': 'bg-purple-100 text-purple-700 border-purple-300',
      'Bioactivity Data': 'bg-orange-100 text-orange-700 border-orange-300',
      'Publication Info': 'bg-pink-100 text-pink-700 border-pink-300',
      'Molecular Structure': 'bg-cyan-100 text-cyan-700 border-cyan-300',
      'Other': 'bg-slate-100 text-slate-700 border-slate-300',
    };
    return colors[category] || colors['Other'];
  }, []);

  // Analyze a specific column
  const analyzeColumn = useCallback((selectedColumn: string | null): ColumnAnalysis | null => {
    if (!selectedColumn || data.length === 0) return null;

    const allValues = data.map((row) => row[selectedColumn] || '');
    const validValues = allValues.filter((v) => v && v.trim() !== '');
    const nullValues = allValues.filter((v) => !v || v.trim() === '');

    const isMolarRatio = selectedColumn === 'lipid_molar_ratio';
    const isLoadingCapacity = selectedColumn === 'loading_capacity_std';
    const isNucleicAcidSequence = selectedColumn === 'nucleic_acid_sequence';
    const isNumerical = isColumnNumerical(selectedColumn);

    const analysis: ColumnAnalysis = {
      totalRecords: data.length,
      validRecords: validValues.length,
      nullRecords: nullValues.length,
      isNumerical: isNumerical || isMolarRatio || isLoadingCapacity,
      isMolarRatio,
      isLoadingCapacity,
      isNucleicAcidSequence,
      isIdentifier: isIdentifierColumn(selectedColumn),
      min: null,
      max: null,
      mean: null,
      median: null,
      uniqueValues: new Set(validValues).size,
      sampleValues: [],
      histogramData: [],
    };

    // Get most popular sample values (top 3 by frequency)
    const valueCounts: Record<string, number> = {};
    validValues.forEach((v) => {
      valueCounts[v] = (valueCounts[v] || 0) + 1;
    });
    
    analysis.sampleValues = Object.entries(valueCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([value]) => value.substring(0, 100) + (value.length > 100 ? '...' : ''));

    // Handle molar ratio special parsing
    if (isMolarRatio) {
      const parsedRatios = parseMolarRatios(validValues);
      const allParsedNumbers: number[] = parsedRatios.flat();
      if (allParsedNumbers.length > 0) {
        const stats = calculateStatistics(allParsedNumbers);
        analysis.min = stats.min;
        analysis.max = stats.max;
        analysis.mean = stats.mean;
        analysis.median = stats.median;
        analysis.histogramData = createHistogramData(allParsedNumbers);
      }
    } else if (isLoadingCapacity) {
      // Special handling for loading capacity - parse complex strings and group by metric type
      const { parsed, metricTypeCounts, wrValues, npValues, concValues } = parseLoadingCapacities(validValues);
      
      // Calculate grouped statistics by metric type
      const groupedStats: LoadingCapacityGroupedStats = {
        wrStats: wrValues.length > 0 ? calculateStatistics(wrValues) : null,
        npStats: npValues.length > 0 ? calculateStatistics(npValues) : null,
        concStats: concValues.length > 0 ? calculateStatistics(concValues) : null,
        wrHistogram: wrValues.length > 0 ? createHistogramData(wrValues) : [],
        npHistogram: npValues.length > 0 ? createHistogramData(npValues) : [],
        concHistogram: concValues.length > 0 ? createHistogramData(concValues) : [],
        wrCount: wrValues.length,
        npCount: npValues.length,
        concCount: concValues.length,
      };
      
      // Determine dominant type for default display
      const dominantType = Object.entries(metricTypeCounts)
        .sort((a, b) => b[1] - a[1])[0]?.[0] as LoadingCapacityMetricType;
      
      // Set global stats from dominant type
      if (dominantType === 'WR' && groupedStats.wrStats) {
        analysis.min = groupedStats.wrStats.min;
        analysis.max = groupedStats.wrStats.max;
        analysis.mean = groupedStats.wrStats.mean;
        analysis.median = groupedStats.wrStats.median;
        analysis.histogramData = groupedStats.wrHistogram;
      } else if (dominantType === 'NP' && groupedStats.npStats) {
        analysis.min = groupedStats.npStats.min;
        analysis.max = groupedStats.npStats.max;
        analysis.mean = groupedStats.npStats.mean;
        analysis.median = groupedStats.npStats.median;
        analysis.histogramData = groupedStats.npHistogram;
      } else if (dominantType === 'CONC' && groupedStats.concStats) {
        analysis.min = groupedStats.concStats.min;
        analysis.max = groupedStats.concStats.max;
        analysis.mean = groupedStats.concStats.mean;
        analysis.median = groupedStats.concStats.median;
        analysis.histogramData = groupedStats.concHistogram;
      }
      
      // Store grouped stats for metric-type-specific display
      analysis.loadingCapacityStats = groupedStats;
      
      // Create pie chart data for metric type distribution
      const total = validValues.length;
      const pieData: PieChartDataPoint[] = [];
      
      const metricTypeLabels: Record<LoadingCapacityMetricType, string> = {
        CONC: 'Concentration (CONC)',
        NP: 'N/P Ratio (NP)',
        WR: 'Weight Ratio (WR)',
        OTHER: 'Other',
        MIXED: 'Mixed',
        UNKNOWN: 'Unknown',
      };
      
      (Object.keys(metricTypeCounts) as LoadingCapacityMetricType[]).forEach((type) => {
        const count = metricTypeCounts[type];
        if (count > 0) {
          pieData.push({
            name: metricTypeLabels[type],
            value: count,
            percentage: ((count / total) * 100).toFixed(1) + '%',
          });
        }
      });
      
      // Sort by value descending
      pieData.sort((a, b) => b.value - a.value);
      
      analysis.pieChartData = pieData;
      
      // Create text stats for metric types
      analysis.textStats = {
        uniqueLabels: Object.values(metricTypeCounts).filter((v) => v > 0).length,
        labelCounts: (Object.keys(metricTypeCounts) as LoadingCapacityMetricType[])
          .filter((type) => metricTypeCounts[type] > 0)
          .map((type) => ({
            label: metricTypeLabels[type],
            count: metricTypeCounts[type],
          }))
          .sort((a, b) => b.count - a.count),
      };
    } else if (isNumerical) {
      const isPercentageColumn = selectedColumn === 'encapsulation_efficiency_percent_std';
      
      const numericalValues = validValues
        .map((v) => isPercentageColumn ? parsePercentageValue(v) : parseNumericValue(v))
        .filter((v) => v !== null) as number[];
      
      if (numericalValues.length > 0) {
        const stats = calculateStatistics(numericalValues);
        analysis.min = stats.min;
        analysis.max = stats.max;
        analysis.mean = stats.mean;
        analysis.median = stats.median;
        analysis.histogramData = isPercentageColumn 
          ? createPercentageHistogramData(numericalValues)
          : createHistogramData(numericalValues);
      }
    } else if (isNucleicAcidSequence) {
      // Special handling for nucleic acid sequence - support normalization
      const valueCounts: Record<string, number> = {};
      validValues.forEach((v) => {
        valueCounts[v] = (valueCounts[v] || 0) + 1;
      });
      
      const total = validValues.length;
      const sortedLabels = Object.entries(valueCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
      
      // Raw distribution (exact strings)
      analysis.rawDistribution = {
        uniqueLabels: new Set(validValues).size,
        labelCounts: sortedLabels.map(([label, count]) => ({ label, count })),
      };
      
      // Normalized distribution (grouped by target)
      const normalizedCounts: Record<string, number> = {};
      validValues.forEach((v) => {
        const normalized = normalizeNucleicAcid(v);
        normalizedCounts[normalized] = (normalizedCounts[normalized] || 0) + 1;
      });
      
      const normalizedSorted = Object.entries(normalizedCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
      
      analysis.normalizedDistribution = {
        uniqueLabels: Object.keys(normalizedCounts).length,
        labelCounts: normalizedSorted.map(([label, count]) => ({ label, count })),
      };
      
      // Default to normalized distribution
      analysis.textStats = analysis.normalizedDistribution;
      
      // Create pie chart from normalized data
      const pieData: PieChartDataPoint[] = normalizedSorted.map(([label, count]) => ({
        name: label.length > 40 ? label.substring(0, 40) + '...' : label,
        value: count,
        percentage: ((count / total) * 100).toFixed(1) + '%',
      }));

      if (Object.keys(normalizedCounts).length > 10) {
        const otherCount = Object.entries(normalizedCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(10)
          .reduce((sum, [, count]) => sum + count, 0);
        pieData.push({
          name: `Other (${Object.keys(normalizedCounts).length - 10} items)`,
          value: otherCount,
          percentage: ((otherCount / total) * 100).toFixed(1) + '%',
        });
      }

      analysis.pieChartData = pieData;
    } else {
      // Text analysis and identifier columns
      const valueCounts: Record<string, number> = {};
      validValues.forEach((v) => {
        valueCounts[v] = (valueCounts[v] || 0) + 1;
      });
      
      const total = validValues.length;
      const sortedLabels = Object.entries(valueCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
      
      analysis.textStats = {
        uniqueLabels: new Set(validValues).size,
        labelCounts: sortedLabels.map(([label, count]) => ({ label, count })),
      };

      // Create pie chart data
      const pieData: PieChartDataPoint[] = sortedLabels.map(([label, count]) => ({
        name: label.length > 30 ? label.substring(0, 30) + '...' : label,
        value: count,
        percentage: ((count / total) * 100).toFixed(1) + '%',
      }));

      if (Object.keys(valueCounts).length > 10) {
        const otherCount = Object.entries(valueCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(10)
          .reduce((sum, [, count]) => sum + count, 0);
        pieData.push({
          name: `Other (${Object.keys(valueCounts).length - 10} items)`,
          value: otherCount,
          percentage: ((otherCount / total) * 100).toFixed(1) + '%',
        });
      }

      analysis.pieChartData = pieData;
    }

    return analysis;
  }, [data, parseMolarRatios, parseNumericValue, parsePercentageValue, normalizeNucleicAcid, calculateStatistics, createHistogramData, createPercentageHistogramData, isColumnNumerical, isIdentifierColumn]);

  // Get molar ratio stats for a specific component
  const getMolarRatioStats = useCallback((index: number): Statistics | null => {
    const molarRatioValues = data
      .map((row) => row['lipid_molar_ratio'] || '')
      .filter((v) => v);
    const parsed = parseMolarRatios(molarRatioValues);
    if (parsed[index].length === 0) return null;
    return calculateStatistics(parsed[index]);
  }, [data, parseMolarRatios, calculateStatistics]);

  return {
    parseMolarRatios,
    parseLoadingCapacity,
    parseNumericValue,
    parsePercentageValue,
    normalizeNucleicAcid,
    calculateStatistics,
    createHistogramData,
    createPercentageHistogramData,
    isColumnNumerical,
    isTextColumn,
    isIdentifierColumn,
    getUniqueCount,
    getColumnCategory,
    getCategoryColor,
    analyzeColumn,
    getMolarRatioStats,
    molarRatioNames: MORTAL_RATIO_NAMES,
  };
}
