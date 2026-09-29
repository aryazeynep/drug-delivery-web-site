'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Database, FileText, Users, BarChart3, BookOpen, ExternalLink,
  Table2, Loader2, ChevronDown, X, TrendingUp, AlertCircle, CheckCircle, Type, Hash, PieChart as PieChartIcon, List, ArrowLeft, Lightbulb, ScatterChart as ScatterChartIcon
} from 'lucide-react';
import {
  ScatterChart as RechartsScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
  ReferenceLine,
} from 'recharts';
import { useDataset, useColumnAnalysis } from '@/hooks/useDataset';
import { LoadingCapacityMetricType } from '@/types/dataset';
import { DistributionHistogram, SmallHistogram, DistributionPieChart, ValueDistribution } from '@/components/DistributionChart';

interface FormulationData {
  ionizable: number;
  peg: number;
  sterol: number;
  helper: number;
  particleSize: number | null;
  pdi: number | null;
  encapsulation: number | null;
  zetaPotential: number | null;
}

interface CorrelationResult {
  variable1: string;
  variable2: string;
  pearsonR: number;
  spearmanR: number;
  count: number;
  pValue: number;
}

// Calculate ranks for Spearman correlation
function calculateRanks(values: number[]): number[] {
  const indexed = values.map((v, i) => ({ value: v, originalIndex: i }));
  indexed.sort((a, b) => a.value - b.value);
  const ranks = new Array(values.length);
  
  let i = 0;
  while (i < indexed.length) {
    let j = i;
    while (j < indexed.length && indexed[j].value === indexed[i].value) {
      j++;
    }
    const avgRank = (i + j + 1) / 2;
    for (let k = i; k < j; k++) {
      ranks[indexed[k].originalIndex] = avgRank;
    }
    i = j;
  }
  
  return ranks;
}

// Calculate p-value from t-statistic
function calculatePValue(r: number, n: number): number {
  if (n <= 2) return 1;
  const t = r * Math.sqrt((n - 2) / (1 - r * r));
  const df = n - 2;
  
  // Approximate p-value using t-distribution
  const x = df / (df + t * t);
  const beta = incompleteBeta(df / 2, 0.5, x);
  return Math.min(1, Math.max(0, beta));
}

// Incomplete beta function approximation
function incompleteBeta(a: number, b: number, x: number): number {
  if (x === 0) return 0;
  if (x === 1) return 1;
  
  const lbeta = logGamma(a) + logGamma(b) - logGamma(a + b);
  const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lbeta) / a;
  
  // Continued fraction approximation
  let f = 1, c = 1, d = 0;
  for (let m = 0; m <= 200; m++) {
    const m2 = 2 * m;
    
    let numerator;
    if (m === 0) {
      numerator = 1;
    } else if (m % 2 === 0) {
      numerator = (m2 * (b - m2) * x) / ((a + m2 - 1) * (a + m2));
    } else {
      numerator = -((a + m2) * (a + b + m2 - 1) * x) / ((a + m2) * (a + m2 - 1));
    }
    
    d = 1 + numerator * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    d = 1 / d;
    
    c = 1 + numerator / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    
    const delta = c * d;
    f *= delta;
    
    if (Math.abs(delta - 1) < 1e-10) break;
  }
  
  return front * (f - 1);
}

function logGamma(x: number): number {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091,
             -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let sum = 1.000000000190015;
  for (let j = 0; j < 6; j++) {
    sum += c[j] / ++y;
  }
  return -tmp + Math.log(2.5066282746310005 * sum / x);
}

// Calculate Spearman rank correlation
function spearmanCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length < 3) return 0;
  
  const ranksX = calculateRanks(x);
  const ranksY = calculateRanks(y);
  
  const n = x.length;
  let sumD2 = 0;
  for (let i = 0; i < n; i++) {
    const d = ranksX[i] - ranksY[i];
    sumD2 += d * d;
  }
  
  return 1 - (6 * sumD2) / (n * (n * n - 1));
}

// Pearson correlation - maintains row pairing
function pearsonCorrelationPaired(x: number[], y: number[]): { r: number; count: number } {
  const pairs: [number, number][] = [];
  for (let i = 0; i < x.length; i++) {
    if (!isNaN(x[i]) && !isNaN(y[i]) && x[i] !== null && y[i] !== null && y[i] !== undefined) {
      pairs.push([x[i], y[i]]);
    }
  }
  
  if (pairs.length < 3) return { r: 0, count: pairs.length };
  
  const n = pairs.length;
  const sumX = pairs.reduce((sum, [x]) => sum + x, 0);
  const sumY = pairs.reduce((sum, [, y]) => sum + y, 0);
  const sumXY = pairs.reduce((sum, [x, y]) => sum + x * y, 0);
  const sumX2 = pairs.reduce((sum, [x]) => sum + x * x, 0);
  const sumY2 = pairs.reduce((sum, [, y]) => sum + y * y, 0);
  
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  
  if (denominator === 0) return { r: 0, count: n };
  
  return { r: numerator / denominator, count: n };
}

// Get color based on correlation value
function getCorrelationColor(r: number): string {
  if (r >= 0.7) return 'bg-red-500 text-white';
  if (r >= 0.4) return 'bg-orange-400 text-white';
  if (r >= 0.1) return 'bg-yellow-300 text-gray-800';
  if (r >= -0.1) return 'bg-gray-200 text-gray-700';
  if (r >= -0.4) return 'bg-cyan-300 text-gray-800';
  if (r >= -0.7) return 'bg-blue-400 text-white';
  return 'bg-blue-600 text-white';
}

function getCorrelationTooltipText(r: number, v1: string, v2: string, count: number, pValue: number): string {
  const pValueStr = pValue < 0.001 ? '< 0.001' : pValue.toFixed(4);
  const significance = pValue < 0.001 ? '***' : pValue < 0.01 ? '**' : pValue < 0.05 ? '*' : '';
  
  if (Math.abs(r) >= 0.7) {
    return `${v1} and ${v2} show strong relationship (n=${count}, p=${pValueStr}${significance})`;
  }
  if (Math.abs(r) >= 0.4) {
    return `${v1} and ${v2} show moderate relationship (n=${count}, p=${pValueStr}${significance})`;
  }
  if (Math.abs(r) >= 0.1) {
    return `${v1} and ${v2} show weak relationship (n=${count}, p=${pValueStr})`;
  }
  return `${v1} and ${v2} show no significant correlation (n=${count}, p=${pValueStr})`;
}

// Custom tooltip for scatter charts
function CustomScatterTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-medium text-gray-800">{data.name || `LNP #${data.lnp_id}`}</p>
        <p className="text-sm text-blue-600">Size: {data.particleSize?.toFixed(1)} nm</p>
        <p className="text-sm text-purple-600">PDI: {data.pdi?.toFixed(3)}</p>
        <p className="text-sm text-green-600">EE: {data.encapsulation?.toFixed(1)}%</p>
        <p className="text-sm text-gray-600">PEG: {data.peg?.toFixed(2)}%</p>
        <p className="text-sm text-orange-600">Ionizable: {data.ionizable?.toFixed(2)}%</p>
      </div>
    );
  }
  return null;
}

export default function LNPAtlas() {
  const { data, columns, loading, error } = useDataset('/lnp_atlas.csv');
  const [selectedColumn, setSelectedColumn] = useState<string | null>(null);
  const [hoveredCell, setHoveredCell] = useState<CorrelationResult | null>(null);
  const [correlationType, setCorrelationType] = useState<'pearson' | 'spearman'>('spearman');
  const [selectedLoadingMetricType, setSelectedLoadingMetricType] = useState<'WR' | 'NP' | 'CONC' | 'ALL'>('ALL');
  const [nucleicAcidViewMode, setNucleicAcidViewMode] = useState<'normalized' | 'raw'>('normalized');
  const [showDataInsights, setShowDataInsights] = useState(false);

  // Filter out lnp_id and reorder columns (put paper_doi at end)
  const displayColumns = useMemo(() => {
    const filtered = columns.filter(col => col !== 'lnp_id');
    const paperDoiIndex = filtered.indexOf('paper_doi');
    if (paperDoiIndex > -1) {
      filtered.splice(paperDoiIndex, 1);
      filtered.push('paper_doi');
    }
    return filtered;
  }, [columns]);

  const {
    getUniqueCount,
    getColumnCategory,
    getCategoryColor,
    analyzeColumn,
    getMolarRatioStats,
    parseMolarRatios,
    createHistogramData,
    molarRatioNames,
  } = useColumnAnalysis(data, columns);

  const analysis = analyzeColumn(selectedColumn);

  // Compute active pie chart data based on nucleic acid view mode
  const activePieChartData = useMemo(() => {
    if (!analysis || !analysis.pieChartData) return null;
    if (!analysis.isNucleicAcidSequence) return analysis.pieChartData;

    // Rebuild pie data based on view mode
    if (nucleicAcidViewMode === 'raw' && analysis.rawDistribution) {
      const total = analysis.validRecords;
      const sorted = analysis.rawDistribution.labelCounts.slice(0, 10);
      const pieData = sorted.map(({ label, count }) => ({
        name: label.length > 40 ? label.substring(0, 40) + '...' : label,
        value: count,
        percentage: ((count / total) * 100).toFixed(1) + '%',
      }));
      
      if (analysis.rawDistribution.labelCounts.length > 10) {
        const otherCount = analysis.rawDistribution.labelCounts
          .slice(10)
          .reduce((sum, { count }) => sum + count, 0);
        pieData.push({
          name: `Other (${analysis.rawDistribution.labelCounts.length - 10} items)`,
          value: otherCount,
          percentage: ((otherCount / total) * 100).toFixed(1) + '%',
        });
      }
      return pieData;
    }
    
    return analysis.pieChartData;
  }, [analysis, nucleicAcidViewMode]);

  // Compute active text stats based on view mode
  const activeTextStats = useMemo(() => {
    if (!analysis) return null;
    if (!analysis.isNucleicAcidSequence) return analysis.textStats;
    return nucleicAcidViewMode === 'raw' ? analysis.rawDistribution : analysis.normalizedDistribution;
  }, [analysis, nucleicAcidViewMode]);

  // Compute active sample values based on view mode
  const activeSampleValues = useMemo(() => {
    if (!analysis) return [];
    if (!analysis.isNucleicAcidSequence || !activeTextStats) return analysis.sampleValues;
    // Return the top 3 labels from the active distribution
    return activeTextStats.labelCounts.slice(0, 3).map(({ label }) => 
      label.length > 100 ? label.substring(0, 100) + '...' : label
    );
  }, [analysis, activeTextStats]);

  // Parse formulation data for correlation analysis
  const formulationData = useMemo((): FormulationData[] => {
    const molarRatios = data
      .map((row) => row['lipid_molar_ratio'] || '')
      .filter((v) => v);
    const parsed = parseMolarRatios(molarRatios);
    
    return data.map((row, idx) => {
      const ionizable = parsed[0][idx];
      const peg = parsed[1][idx];
      const sterol = parsed[2][idx];
      const helper = parsed[3][idx];
      
      return {
        ionizable: isNaN(ionizable) ? 0 : ionizable,
        peg: isNaN(peg) ? 0 : peg,
        sterol: isNaN(sterol) ? 0 : sterol,
        helper: isNaN(helper) ? 0 : helper,
        particleSize: parseFloat(row['particle_size_nm_std']) || null,
        pdi: parseFloat(row['pdi_std']) || null,
        encapsulation: parseFloat(row['encapsulation_efficiency_percent_std']) || null,
        zetaPotential: parseFloat(row['zeta_potential_mv_std']) || null,
      };
    });
  }, [data, parseMolarRatios]);

  // Calculate correlation matrix with both Pearson and Spearman
  const correlations = useMemo((): CorrelationResult[] => {
    const vars = [
      { key: 'ionizable', label: 'Ionizable Lipid', values: formulationData.map((d) => d.ionizable) },
      { key: 'peg', label: 'PEG Lipid', values: formulationData.map((d) => d.peg) },
      { key: 'sterol', label: 'Sterol Lipid', values: formulationData.map((d) => d.sterol) },
      { key: 'helper', label: 'Helper Lipid', values: formulationData.map((d) => d.helper) },
      { key: 'particleSize', label: 'Particle Size', values: formulationData.map((d) => d.particleSize) },
      { key: 'pdi', label: 'PDI', values: formulationData.map((d) => d.pdi) },
      { key: 'encapsulation', label: 'Encapsulation', values: formulationData.map((d) => d.encapsulation) },
      { key: 'zetaPotential', label: 'Zeta Potential', values: formulationData.map((d) => d.zetaPotential) },
    ];

    const results: CorrelationResult[] = [];
    
    for (let i = 0; i < vars.length; i++) {
      for (let j = i + 1; j < vars.length; j++) {
        // Create paired arrays - only include rows where BOTH variables are valid
        const pairedX: number[] = [];
        const pairedY: number[] = [];
        
        for (let k = 0; k < vars[i].values.length; k++) {
          const xVal = vars[i].values[k];
          const yVal = vars[j].values[k];
          
          // Only include if both are valid numbers
          if (xVal !== null && yVal !== null && !isNaN(xVal) && !isNaN(yVal)) {
            pairedX.push(xVal);
            pairedY.push(yVal);
          }
        }
        
        // Calculate Pearson on paired data
        const { r: pearsonR, count } = pearsonCorrelationPaired(pairedX, pairedY);
        
        // Calculate Spearman on paired data
        const spearmanR = spearmanCorrelation(pairedX, pairedY);
        
        // Calculate p-value
        const pValue = calculatePValue(pearsonR, count);
        
        results.push({
          variable1: vars[i].label,
          variable2: vars[j].label,
          pearsonR,
          spearmanR,
          count,
          pValue,
        });
      }
    }
    
    return results;
  }, [formulationData]);

  // Prepare scatter chart data
  const scatterDataPEGSize = useMemo(() => {
    return formulationData
      .filter((d) => d.peg > 0 && d.particleSize !== null)
      .map((d, idx) => ({
        x: d.peg,
        y: d.particleSize!,
        name: `LNP #${idx + 1}`,
        lnp_id: idx + 1,
        ...d,
      }));
  }, [formulationData]);

  const scatterDataIonEncaps = useMemo(() => {
    return formulationData
      .filter((d) => d.ionizable > 0 && d.encapsulation !== null)
      .map((d, idx) => ({
        x: d.ionizable,
        y: d.encapsulation!,
        name: `LNP #${idx + 1}`,
        lnp_id: idx + 1,
        ...d,
      }));
  }, [formulationData]);

  const scatterDataSizePDI = useMemo(() => {
    return formulationData
      .filter((d) => d.particleSize !== null && d.pdi !== null)
      .map((d, idx) => ({
        x: d.particleSize!,
        y: d.pdi!,
        name: `LNP #${idx + 1}`,
        lnp_id: idx + 1,
        ...d,
      }));
  }, [formulationData]);

  // Get correlation value based on selected type
  const getCorrelation = (v1: string, v2: string): number => {
    const corr = correlations.find(
      (c) =>
        (c.variable1 === v1 && c.variable2 === v2) ||
        (c.variable1 === v2 && c.variable2 === v1)
    );
    if (!corr) return 0;
    return correlationType === 'pearson' ? corr.pearsonR : corr.spearmanR;
  };

  const getCorrelationDetails = (v1: string, v2: string): CorrelationResult | null => {
    return correlations.find(
      (c) =>
        (c.variable1 === v1 && c.variable2 === v2) ||
        (c.variable1 === v2 && c.variable2 === v1)
    ) || null;
  };

  const variables = ['Ionizable Lipid', 'PEG Lipid', 'Sterol Lipid', 'Helper Lipid', 'Particle Size', 'PDI', 'Encapsulation', 'Zeta Potential'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
          <p className="text-gray-500">Loading LNP Atlas dataset...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="border-red-200 bg-red-50 max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-red-600">Error loading CSV: {error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header Section */}
      <Card className="mb-8 border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardHeader>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="ghost" size="sm" className="p-2 hover:bg-blue-100">
                  <ArrowLeft className="w-5 h-5 text-blue-600" />
                </Button>
              </Link>
              <Database className="w-10 h-10 text-blue-600" />
              <div>
                <CardTitle className="text-3xl font-bold text-gray-900">LNP Atlas</CardTitle>
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100 mt-1">
                  Active Dataset
                </Badge>
              </div>
            </div>
          </div>
          <CardDescription className="text-base space-y-1">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              <span className="font-medium text-gray-700">
                A Comprehensive Dataset of Lipid Nanoparticle Compositions
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              <a
                href="https://doi.org/10.1038/s41597-025-06456-w"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                https://doi.org/10.1038/s41597-025-06456-w
              </a>
            </div>
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
              <Database className="w-4 h-4" />
              Total Entries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900">{data.length.toLocaleString()}</div>
            <p className="text-xs text-blue-600 mt-1">LNP compositions</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-purple-700 flex items-center gap-2">
              <Table2 className="w-4 h-4" />
              Total Columns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-900">{columns.length}</div>
            <p className="text-xs text-purple-600 mt-1">Data attributes</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-green-700 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Publications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-900">
              {getUniqueCount('paper_title')}
            </div>
            <p className="text-xs text-green-600 mt-1">Referenced studies</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-pink-700 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Unique Lipids
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-pink-900">
              {getUniqueCount('ionizable_lipid')}
            </div>
            <p className="text-xs text-pink-600 mt-1">Ionizable lipid types</p>
          </CardContent>
        </Card>
      </div>

      {/* Columns Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            Dataset Columns
          </CardTitle>
          <CardDescription>
            Click on any column to view detailed analysis. The dataset contains {displayColumns.length} attributes across {data.length.toLocaleString()} entries.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {displayColumns.map((column) => {
              const category = getColumnCategory(column);
              const isSelected = selectedColumn === column;

              return (
                <Button
                  key={column}
                  variant="outline"
                  className={`h-auto py-3 px-4 flex flex-col items-start gap-2 transition-all ${
                    isSelected
                      ? 'ring-2 ring-blue-500 bg-blue-50'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => {
                    setSelectedColumn(isSelected ? null : column);
                  }}
                >
                  <div className="flex items-center gap-2 w-full">
                    <span className="font-mono text-sm font-medium text-gray-800 truncate">
                      {column}
                    </span>
                    {column === 'lipid_molar_ratio' && <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200 ml-auto">Parsed</Badge>}
                  </div>
                  <div className="flex items-center gap-2 w-full">
                    <Badge
                      variant="outline"
                      className={`text-xs ${getCategoryColor(category)}`}
                    >
                      {category}
                    </Badge>
                  </div>
                </Button>
              );
            })}
          </div>

          {/* Column Analysis Panel */}
          {selectedColumn && analysis && (
            <div className="mt-6 border border-gray-200 rounded-lg bg-white overflow-hidden animate-in slide-in-from-top-4 duration-300">
              {/* Analysis Header */}
              <div className="bg-gradient-to-r from-gray-50 to-slate-50 p-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100">
                    {analysis.isNumerical ? (
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                    ) : (
                      <Type className="w-5 h-5 text-purple-600" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                      Column Analysis: <code className="bg-white px-2 py-0.5 rounded border">{selectedColumn}</code>
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={getCategoryColor(getColumnCategory(selectedColumn))}>
                        {getColumnCategory(selectedColumn)}
                      </Badge>
                      <Badge variant="outline" className={analysis.isNumerical ? 'bg-green-50 text-green-700 border-green-200' : 'bg-purple-50 text-purple-700 border-purple-200'}>
                        {analysis.isNumerical ? 'Numerical' : 'Categorical'}
                      </Badge>
                      {analysis.isMolarRatio && (
                        <Badge className="bg-amber-100 text-amber-700 border-amber-200">Molar Ratio (4 components)</Badge>
                      )}
                      {analysis.isLoadingCapacity && (
                        <Badge className="bg-teal-100 text-teal-700 border-teal-200">Loading Capacity (parsed)</Badge>
                      )}
                      {analysis.isIdentifier && (
                        <Badge className="bg-gray-100 text-gray-700 border-gray-300">
                          <Hash className="w-3 h-3 mr-1" />
                          Identifier
                        </Badge>
                      )}
                      {analysis.isNucleicAcidSequence && (
                        <div className="flex items-center gap-2 ml-2">
                          <span className="text-xs text-gray-500">View:</span>
                          <div className="flex rounded-md border border-gray-300 overflow-hidden">
                            <button
                              onClick={() => setNucleicAcidViewMode('normalized')}
                              className={`px-2 py-0.5 text-xs font-medium transition-colors ${
                                nucleicAcidViewMode === 'normalized'
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-white text-gray-600 hover:bg-gray-50'
                              }`}
                            >
                              Normalized
                            </button>
                            <button
                              onClick={() => setNucleicAcidViewMode('raw')}
                              className={`px-2 py-0.5 text-xs font-medium transition-colors ${
                                nucleicAcidViewMode === 'raw'
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-white text-gray-600 hover:bg-gray-50'
                              }`}
                            >
                              Raw
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedColumn(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="p-6 space-y-6">
                {/* Data Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-gray-600">Valid Records</span>
                      </div>
                      <div className="text-2xl font-bold text-gray-800">{analysis.validRecords.toLocaleString()}</div>
                      <p className="text-xs text-gray-500 mt-1">
                        {((analysis.validRecords / analysis.totalRecords) * 100).toFixed(1)}% complete
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-red-50 to-orange-50 border-red-200">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-4 h-4 text-red-600" />
                        <span className="text-sm font-medium text-gray-600">Missing Values</span>
                      </div>
                      <div className="text-2xl font-bold text-gray-800">{analysis.nullRecords.toLocaleString()}</div>
                      <p className="text-xs text-gray-500 mt-1">
                        {((analysis.nullRecords / analysis.totalRecords) * 100).toFixed(1)}% missing
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Hash className="w-4 h-4 text-purple-600" />
                        <span className="text-sm font-medium text-gray-600">Unique Values</span>
                      </div>
                      <div className="text-2xl font-bold text-gray-800">
                        {analysis.isNucleicAcidSequence 
                          ? (nucleicAcidViewMode === 'normalized' 
                              ? (analysis.normalizedDistribution?.uniqueLabels || 0)
                              : analysis.uniqueValues)
                          : analysis.uniqueValues}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {analysis.isNucleicAcidSequence && nucleicAcidViewMode === 'normalized'
                          ? 'normalized categories'
                          : 'distinct entries'}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Sample Values */}
                <div>
                  <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Sample Values
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {activeSampleValues.length > 0 ? (
                      activeSampleValues.map((val, idx) => (
                        <div
                          key={idx}
                          className="bg-gray-50 px-4 py-2 rounded-lg border border-gray-200 text-sm font-mono max-w-md truncate"
                          title={val}
                        >
                          {val}
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 italic">No valid values found</p>
                    )}
                  </div>
                </div>

                {/* Molar Ratio Individual Component Analysis with Histograms */}
                {analysis.isMolarRatio && (
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Individual Component Analysis
                    </h4>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {molarRatioNames.map((name, idx) => {
                        const stats = getMolarRatioStats(idx);
                        const molarRatioValues = data
                          .map((row) => row['lipid_molar_ratio'] || '')
                          .filter((v) => v);
                        const parsed = parseMolarRatios(molarRatioValues);
                        const histogramData = createHistogramData(parsed[idx]);
                        return (
                          <Card key={idx} className="bg-gradient-to-br from-cyan-50 to-blue-50 border-cyan-200">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm">{name}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              {stats ? (
                                <>
                                  <div className="grid grid-cols-4 gap-2 text-xs">
                                    <div className="text-center">
                                      <p className="text-gray-500">Min</p>
                                      <p className="font-medium">{stats.min.toFixed(2)}</p>
                                    </div>
                                    <div className="text-center">
                                      <p className="text-gray-500">Max</p>
                                      <p className="font-medium">{stats.max.toFixed(2)}</p>
                                    </div>
                                    <div className="text-center">
                                      <p className="text-gray-500">Mean</p>
                                      <p className="font-medium">{stats.mean.toFixed(2)}</p>
                                    </div>
                                    <div className="text-center">
                                      <p className="text-gray-500">Median</p>
                                      <p className="font-medium">{stats.median.toFixed(2)}</p>
                                    </div>
                                  </div>
                                  {histogramData.length > 0 && (
                                    <SmallHistogram data={histogramData} />
                                  )}
                                </>
                              ) : (
                                <p className="text-gray-500 text-sm">No data available</p>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Loading Capacity Analysis with Metric Type Breakdown */}
                {analysis.isLoadingCapacity && analysis.loadingCapacityStats && (
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Loading Capacity Statistics
                    </h4>
                    
                    {/* Metric Type Filter Tabs */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      <Button
                        variant={selectedLoadingMetricType === 'ALL' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedLoadingMetricType('ALL')}
                        className="text-xs"
                      >
                        All (dominant)
                      </Button>
                      {analysis.loadingCapacityStats.wrCount > 0 && (
                        <Button
                          variant={selectedLoadingMetricType === 'WR' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSelectedLoadingMetricType('WR')}
                          className="text-xs"
                        >
                          Weight Ratio (WR) {analysis.loadingCapacityStats.wrCount}
                        </Button>
                      )}
                      {analysis.loadingCapacityStats.npCount > 0 && (
                        <Button
                          variant={selectedLoadingMetricType === 'NP' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSelectedLoadingMetricType('NP')}
                          className="text-xs"
                        >
                          N/P Ratio (NP) {analysis.loadingCapacityStats.npCount}
                        </Button>
                      )}
                      {analysis.loadingCapacityStats.concCount > 0 && (
                        <Button
                          variant={selectedLoadingMetricType === 'CONC' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSelectedLoadingMetricType('CONC')}
                          className="text-xs"
                        >
                          Concentration (CONC) {analysis.loadingCapacityStats.concCount}
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                        <CardContent className="pt-4 text-center">
                          <p className="text-xs text-gray-500 mb-1">Minimum</p>
                          <p className="text-xl font-bold text-green-700">
                            {selectedLoadingMetricType === 'ALL'
                              ? (analysis.min !== null ? analysis.min.toFixed(2) : 'N/A')
                              : (analysis.loadingCapacityStats[
                                  selectedLoadingMetricType === 'WR' ? 'wrStats' :
                                  selectedLoadingMetricType === 'NP' ? 'npStats' : 'concStats'
                                ]?.min !== undefined
                                  ? (analysis.loadingCapacityStats[
                                      selectedLoadingMetricType === 'WR' ? 'wrStats' :
                                      selectedLoadingMetricType === 'NP' ? 'npStats' : 'concStats'
                                    ] as any)?.min.toFixed(2)
                                  : 'N/A')}
                          </p>
                        </CardContent>
                      </Card>
                      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                        <CardContent className="pt-4 text-center">
                          <p className="text-xs text-gray-500 mb-1">Maximum</p>
                          <p className="text-xl font-bold text-blue-700">
                            {selectedLoadingMetricType === 'ALL'
                              ? (analysis.max !== null ? analysis.max.toFixed(2) : 'N/A')
                              : (analysis.loadingCapacityStats[
                                  selectedLoadingMetricType === 'WR' ? 'wrStats' :
                                  selectedLoadingMetricType === 'NP' ? 'npStats' : 'concStats'
                                ]?.max !== undefined
                                  ? (analysis.loadingCapacityStats[
                                      selectedLoadingMetricType === 'WR' ? 'wrStats' :
                                      selectedLoadingMetricType === 'NP' ? 'npStats' : 'concStats'
                                    ] as any)?.max.toFixed(2)
                                  : 'N/A')}
                          </p>
                        </CardContent>
                      </Card>
                      <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
                        <CardContent className="pt-4 text-center">
                          <p className="text-xs text-gray-500 mb-1">Mean</p>
                          <p className="text-xl font-bold text-purple-700">
                            {selectedLoadingMetricType === 'ALL'
                              ? (analysis.mean !== null ? analysis.mean.toFixed(2) : 'N/A')
                              : (analysis.loadingCapacityStats[
                                  selectedLoadingMetricType === 'WR' ? 'wrStats' :
                                  selectedLoadingMetricType === 'NP' ? 'npStats' : 'concStats'
                                ]?.mean !== undefined
                                  ? (analysis.loadingCapacityStats[
                                      selectedLoadingMetricType === 'WR' ? 'wrStats' :
                                      selectedLoadingMetricType === 'NP' ? 'npStats' : 'concStats'
                                    ] as any)?.mean.toFixed(2)
                                  : 'N/A')}
                          </p>
                        </CardContent>
                      </Card>
                      <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
                        <CardContent className="pt-4 text-center">
                          <p className="text-xs text-gray-500 mb-1">Median</p>
                          <p className="text-xl font-bold text-orange-700">
                            {selectedLoadingMetricType === 'ALL'
                              ? (analysis.median !== null ? analysis.median.toFixed(2) : 'N/A')
                              : (analysis.loadingCapacityStats[
                                  selectedLoadingMetricType === 'WR' ? 'wrStats' :
                                  selectedLoadingMetricType === 'NP' ? 'npStats' : 'concStats'
                                ]?.median !== undefined
                                  ? (analysis.loadingCapacityStats[
                                      selectedLoadingMetricType === 'WR' ? 'wrStats' :
                                      selectedLoadingMetricType === 'NP' ? 'npStats' : 'concStats'
                                    ] as any)?.median.toFixed(2)
                                  : 'N/A')}
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}

                {/* Numerical Analysis */}
                {analysis.isNumerical && !analysis.isMolarRatio && !analysis.isLoadingCapacity && (
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Numerical Statistics
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                        <CardContent className="pt-4 text-center">
                          <p className="text-xs text-gray-500 mb-1">Minimum</p>
                          <p className="text-xl font-bold text-green-700">
                            {analysis.min !== null ? analysis.min.toFixed(2) : 'N/A'}
                          </p>
                        </CardContent>
                      </Card>
                      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                        <CardContent className="pt-4 text-center">
                          <p className="text-xs text-gray-500 mb-1">Maximum</p>
                          <p className="text-xl font-bold text-blue-700">
                            {analysis.max !== null ? analysis.max.toFixed(2) : 'N/A'}
                          </p>
                        </CardContent>
                      </Card>
                      <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
                        <CardContent className="pt-4 text-center">
                          <p className="text-xs text-gray-500 mb-1">Mean</p>
                          <p className="text-xl font-bold text-purple-700">
                            {analysis.mean !== null ? analysis.mean.toFixed(2) : 'N/A'}
                          </p>
                        </CardContent>
                      </Card>
                      <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
                        <CardContent className="pt-4 text-center">
                          <p className="text-xs text-gray-500 mb-1">Median</p>
                          <p className="text-xl font-bold text-orange-700">
                            {analysis.median !== null ? analysis.median.toFixed(2) : 'N/A'}
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}

                {/* Histogram Visualization */}
                {analysis.isNumerical && !analysis.isMolarRatio && analysis.histogramData.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" />
                      {analysis.isLoadingCapacity ? (
                        selectedLoadingMetricType === 'ALL'
                          ? `Numeric Value Distribution (all types)`
                          : `${selectedLoadingMetricType} Distribution`
                      ) : 'Distribution Histogram'}
                    </h4>
                    <Card className="bg-white border-gray-200">
                      <CardContent className="pt-4">
                        <DistributionHistogram
                          data={
                            analysis.isLoadingCapacity
                              ? (selectedLoadingMetricType === 'ALL'
                                  ? analysis.histogramData
                                  : (selectedLoadingMetricType === 'WR'
                                      ? analysis.loadingCapacityStats?.wrHistogram
                                      : selectedLoadingMetricType === 'NP'
                                        ? analysis.loadingCapacityStats?.npHistogram
                                        : analysis.loadingCapacityStats?.concHistogram) || [])
                              : analysis.histogramData
                          }
                        />
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Text Analysis / Categorical Analysis */}
                {activeTextStats && (
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <List className="w-4 h-4" />
                      {analysis.isNucleicAcidSequence && nucleicAcidViewMode === 'raw'
                        ? 'Raw Sequence Distribution'
                        : 'Top 10 Value Distribution'}
                    </h4>
                    <Card className="bg-gradient-to-br from-slate-50 to-gray-50 border-slate-200">
                      <CardContent className="pt-4">
                        <ValueDistribution
                          labelCounts={activeTextStats.labelCounts}
                          maxCount={activeTextStats.labelCounts[0]?.count || 1}
                        />
                        {activeTextStats.uniqueLabels > 10 && (
                          <p className="text-sm text-gray-500 italic mt-4 text-center">
                            Showing top 10 of {activeTextStats.uniqueLabels.toLocaleString()} unique values
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Pie Chart Visualization */}
                {activePieChartData && activePieChartData.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <PieChartIcon className="w-4 h-4" />
                      {analysis.isNucleicAcidSequence && nucleicAcidViewMode === 'raw' 
                        ? 'Raw Sequence Distribution' 
                        : 'Distribution Overview'}
                    </h4>
                    <Card className="bg-white border-gray-200">
                      <CardContent className="pt-4">
                        <DistributionPieChart data={activePieChartData} />
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Insights & Formulation Relationships Section */}
      <Card className="mb-8 border-2 border-indigo-200 bg-gradient-to-br from-indigo-50/30 to-purple-50/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Lightbulb className="w-6 h-6 text-amber-500" />
              Data Insights & Formulation Relationships
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDataInsights(!showDataInsights)}
              className="border-indigo-300 text-indigo-700 hover:bg-indigo-50"
            >
              {showDataInsights ? (
                <>
                  <ChevronDown className="w-4 h-4 mr-1" />
                  Hide
                </>
              ) : (
                <>
                  <Lightbulb className="w-4 h-4 mr-1" />
                  Show
                </>
              )}
            </Button>
          </div>
          {!showDataInsights && (
            <CardDescription>
              Click "Show" to analyze the interplay between formulation ratios and physical nanoparticle outcomes across {data.length.toLocaleString()} LNP compositions
            </CardDescription>
          )}
        </CardHeader>
        {showDataInsights && (
        <CardContent className="space-y-8">
          {/* Correlation Matrix */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-600" />
                Correlation Matrix
              </h4>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Method:</span>
                <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                  <button
                    onClick={() => setCorrelationType('spearman')}
                    className={`px-3 py-1 text-xs font-medium transition-colors ${
                      correlationType === 'spearman'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Spearman
                  </button>
                  <button
                    onClick={() => setCorrelationType('pearson')}
                    className={`px-3 py-1 text-xs font-medium transition-colors ${
                      correlationType === 'pearson'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Pearson
                  </button>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <div className="inline-block min-w-full" style={{ minWidth: '700px' }}>
                <div className="flex items-end mb-4">
                  {/* Column labels */}
                  <div className="w-40 flex-shrink-0" />
                  {variables.map((v) => (
                    <div
                      key={v}
                      className="flex-shrink-0 px-0.5 text-center"
                      style={{ width: '80px', height: '80px', position: 'relative' }}
                    >
                      <p 
                        className="text-xs font-medium text-gray-600 whitespace-pre-wrap leading-tight"
                        style={{ 
                          position: 'absolute', 
                          bottom: '0', 
                          left: '50%', 
                          transform: 'rotate(-45deg)', 
                          transformOrigin: 'top left',
                          whiteSpace: 'pre-wrap',
                          maxWidth: '120px',
                          textAlign: 'left'
                        }}
                      >
                        {v}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Matrix rows */}
                {variables.map((rowVar, rowIdx) => (
                  <div key={rowVar} className="flex items-center mb-1">
                    <div className="w-40 flex-shrink-0 pr-3 text-right">
                      <p className="text-xs font-medium text-gray-600 truncate" title={rowVar}>
                        {rowVar}
                      </p>
                    </div>

                    {/* Cells */}
                    {variables.map((colVar, colIdx) => {
                      if (colIdx < rowIdx) {
                        // Lower triangle - show correlation
                        const corr = getCorrelationDetails(rowVar, colVar);
                        const rValue = correlationType === 'spearman' ? corr?.spearmanR : corr?.pearsonR;

                        const handleMouseEnter = () => {
                          if (corr) {
                            setHoveredCell({
                              ...corr,
                              variable1: rowVar,
                              variable2: colVar,
                            });
                          }
                        };

                        return (
                          <div
                            key={`${rowVar}-${colVar}`}
                            className={`flex-shrink-0 p-1 transition-all cursor-pointer ${getCorrelationColor(rValue || 0)} rounded`}
                            style={{ width: '80px' }}
                            onMouseEnter={handleMouseEnter}
                            onMouseLeave={() => setHoveredCell(null)}
                            title={corr ? getCorrelationTooltipText(
                              correlationType === 'spearman' ? corr.spearmanR : corr.pearsonR,
                              rowVar,
                              colVar,
                              corr.count,
                              corr.pValue
                            ) : ''}
                          >
                            <p className="text-xs font-semibold text-center">
                              {rValue ? rValue.toFixed(2) : ''}
                            </p>
                          </div>
                        );
                      } else if (colIdx === rowIdx) {
                        return (
                          <div
                            key={`${rowVar}-${colVar}`}
                            className="flex-shrink-0 p-1 bg-gray-100 rounded"
                            style={{ width: '80px' }}
                          >
                            <p className="text-xs font-semibold text-center text-gray-400">1.00</p>
                          </div>
                        );
                      }
                      return (
                        <div
                          key={`${rowVar}-${colVar}`}
                          className="flex-shrink-0 p-1"
                          style={{ width: '80px' }}
                        />
                      );
                    })}
                  </div>
                ))}
                
                {/* Correlation legend */}
                <div className="mt-6 flex items-center justify-center gap-4 flex-wrap">
                  <div className="flex items-center gap-1">
                    <div className="w-6 h-4 bg-blue-600 rounded" />
                    <span className="text-xs text-gray-600">-1.0</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-6 h-4 bg-cyan-300 rounded" />
                    <span className="text-xs text-gray-600">-0.4</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-6 h-4 bg-gray-200 rounded" />
                    <span className="text-xs text-gray-600">0.0</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-6 h-4 bg-yellow-300 rounded" />
                    <span className="text-xs text-gray-600">+0.4</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-6 h-4 bg-red-500 rounded" />
                    <span className="text-xs text-gray-600">+1.0</span>
                  </div>
                </div>
                
                {/* Tooltip display */}
                {hoveredCell && (
                  <div className="mt-4 p-3 bg-white border border-gray-200 rounded-lg shadow-md max-w-md mx-auto">
                    <p className="text-sm font-medium text-gray-800">
                      {hoveredCell.variable1} ↔ {hoveredCell.variable2}
                    </p>
                    <div className="flex items-center gap-4 mt-2">
                      <div>
                        <p className="text-xs text-gray-500">Spearman ρ</p>
                        <p className="text-sm font-semibold text-indigo-600">
                          {hoveredCell.spearmanR.toFixed(3)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Pearson r</p>
                        <p className="text-sm font-semibold text-purple-600">
                          {hoveredCell.pearsonR.toFixed(3)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">n</p>
                        <p className="text-sm font-semibold text-gray-700">
                          {hoveredCell.count}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">p-value</p>
                        <p className="text-sm font-semibold text-orange-600">
                          {hoveredCell.pValue < 0.001 ? '< 0.001' : hoveredCell.pValue.toFixed(4)}
                          {hoveredCell.pValue < 0.001 ? '***' : hoveredCell.pValue < 0.01 ? '**' : hoveredCell.pValue < 0.05 ? '*' : ''}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {getCorrelationTooltipText(
                        correlationType === 'spearman' ? hoveredCell.spearmanR : hoveredCell.pearsonR,
                        hoveredCell.variable1,
                        hoveredCell.variable2,
                        hoveredCell.count,
                        hoveredCell.pValue
                      )}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Scatter Charts */}
          <div>
            <h4 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <ScatterChartIcon className="w-5 h-5 text-purple-600" />
              Key Relational Scatter Charts
            </h4>
            <div className="grid grid-cols-1 gap-6">
              {/* Chart A: PEG vs Particle Size */}
              <Card className="bg-white border-gray-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">PEG Lipid Ratio vs. Particle Size</CardTitle>
                  <CardDescription className="text-xs">
                    n = {scatterDataPEGSize.length} data points | {correlationType === 'spearman' ? 'Spearman ρ' : 'Pearson r'} = {getCorrelation('PEG Lipid', 'Particle Size').toFixed(3)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsScatterChart margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="2 2" stroke="#e5e7eb" />
                      <XAxis
                        type="number"
                        dataKey="x"
                        name="PEG Ratio"
                        unit="%"
                        tick={{ fontSize: 11 }}
                        label={{ value: 'PEG (%)', position: 'insideBottom', offset: -10, fontSize: 12 }}
                      />
                      <YAxis
                        type="number"
                        dataKey="y"
                        name="Particle Size"
                        unit=" nm"
                        tick={{ fontSize: 11 }}
                        width={60}
                        label={{ value: 'Size (nm)', angle: -90, position: 'insideLeft', fontSize: 12 }}
                      />
                      <Tooltip content={<CustomScatterTooltip />} />
                      <ReferenceLine y={80} stroke="#94a3b8" strokeDasharray="3 3" label={{ value: '80nm', position: 'right', fontSize: 10 }} />
                      <Scatter
                        name="LNPs"
                        data={scatterDataPEGSize}
                        fill="#8b5cf6"
                        fillOpacity={0.6}
                      />
                    </RechartsScatterChart>
                  </ResponsiveContainer>
                  <p className="text-sm text-gray-600 mt-3 text-center">
                    Higher PEG content reduces particle diameter
                  </p>
                </CardContent>
              </Card>

              {/* Chart B: Ionizable vs Encapsulation */}
              <Card className="bg-white border-gray-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Ionizable Lipid vs. Encapsulation Efficiency</CardTitle>
                  <CardDescription className="text-xs">
                    n = {scatterDataIonEncaps.length} data points | {correlationType === 'spearman' ? 'Spearman ρ' : 'Pearson r'} = {getCorrelation('Ionizable Lipid', 'Encapsulation').toFixed(3)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsScatterChart margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="2 2" stroke="#e5e7eb" />
                      <XAxis
                        type="number"
                        dataKey="x"
                        name="Ionizable Lipid"
                        unit="%"
                        tick={{ fontSize: 11 }}
                        label={{ value: 'Ionizable (%)', position: 'insideBottom', offset: -10, fontSize: 12 }}
                      />
                      <YAxis
                        type="number"
                        dataKey="y"
                        name="Encapsulation"
                        unit="%"
                        tick={{ fontSize: 11 }}
                        width={60}
                        label={{ value: 'EE (%)', angle: -90, position: 'insideLeft', fontSize: 12 }}
                      />
                      <Tooltip content={<CustomScatterTooltip />} />
                      <ReferenceLine x={50} stroke="#94a3b8" strokeDasharray="3 3" label={{ value: '50%', position: 'top', fontSize: 10 }} />
                      <Scatter
                        name="LNPs"
                        data={scatterDataIonEncaps}
                        fill="#10b981"
                        fillOpacity={0.6}
                      />
                    </RechartsScatterChart>
                  </ResponsiveContainer>
                  <p className="text-sm text-gray-600 mt-3 text-center">
                    Ionizable lipid influences payload entrapment
                  </p>
                </CardContent>
              </Card>

              {/* Chart C: Size vs PDI */}
              <Card className="bg-white border-gray-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Particle Size vs. PDI (Homogeneity)</CardTitle>
                  <CardDescription className="text-xs">
                    n = {scatterDataSizePDI.length} data points | {correlationType === 'spearman' ? 'Spearman ρ' : 'Pearson r'} = {getCorrelation('Particle Size', 'PDI').toFixed(3)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsScatterChart margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="2 2" stroke="#e5e7eb" />
                      <XAxis
                        type="number"
                        dataKey="x"
                        name="Particle Size"
                        unit=" nm"
                        tick={{ fontSize: 11 }}
                        label={{ value: 'Size (nm)', position: 'insideBottom', offset: -10, fontSize: 12 }}
                      />
                      <YAxis
                        type="number"
                        dataKey="y"
                        name="PDI"
                        tick={{ fontSize: 11 }}
                        width={60}
                        domain={[0, 0.5]}
                        label={{ value: 'PDI', angle: -90, position: 'insideLeft', fontSize: 12 }}
                      />
                      <Tooltip content={<CustomScatterTooltip />} />
                      <ReferenceLine y={0.3} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'PDI 0.3', position: 'right', fontSize: 10 }} />
                      <Scatter
                        name="LNPs"
                        data={scatterDataSizePDI}
                        fill="#f59e0b"
                        fillOpacity={0.6}
                      />
                    </RechartsScatterChart>
                  </ResponsiveContainer>
                  <p className="text-sm text-gray-600 mt-3 text-center">
                    Larger particles show higher polydispersity
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Key Takeaways */}
          <div>
            <h4 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              Key Formulation Rules
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-purple-600" />
                    Size Control
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-700">
                    Higher PEG lipid percentage <span className="font-semibold text-purple-700">strictly reduces</span> hydrodynamic diameter. PEGylation creates a stealth corona that limits particle aggregation and controls final size.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-orange-600" />
                    Homogeneity vs Efficiency
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-700">
                    High PDI (heterogeneity) <span className="font-semibold text-orange-700">negatively correlates</span> with encapsulation efficiency. Monodisperse formulations maintain better payload retention.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-cyan-50 to-blue-50 border-cyan-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Hash className="w-4 h-4 text-cyan-600" />
                    Stoichiometric Balance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-700">
                    Sterol and Ionizable lipid ratios demonstrate <span className="font-semibold text-cyan-700">strong compensatory trade-offs</span> to maintain formulation volume and membrane stability.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
        )}
      </Card>
    </div>
  );
}
