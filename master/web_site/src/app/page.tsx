import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Database, FileText, ArrowRight, BookOpen, ExternalLink } from "lucide-react";

export default function Home() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Welcome Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Database className="w-10 h-10 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Welcome to LNP Data Portal</h1>
        </div>
        <p className="text-gray-600 text-lg">
          Nanomaterials & Biological Interface Lab - Central hub for lipid nanoparticle research data
        </p>
      </div>

      {/* Quick Access Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* LNP Atlas Card */}
        <Link href="/lnp-atlas" className="block">
          <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200 hover:border-blue-400">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Database className="w-8 h-8 text-blue-600" />
                <CardTitle className="text-xl whitespace-nowrap">LNP Data</CardTitle>
              </div>
              <CardDescription>
                Comprehensive dataset of lipid nanoparticle compositions with physicochemical properties
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-blue-600 font-medium">
                Open Dataset <ArrowRight className="w-4 h-4 ml-2" />
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Paper Reference Card */}
        <Card className="h-full bg-gradient-to-br from-purple-50 to-pink-100 border-purple-200">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-8 h-8 text-purple-600" />
              <CardTitle className="text-xl">Reference Paper</CardTitle>
            </div>
            <CardDescription>
              Curated from 63 peer-reviewed publications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Covering LNP research from 2005-2025, spanning mRNA therapeutics, gene delivery, and vaccine applications.
            </p>
          </CardContent>
        </Card>

        {/* Statistics Card */}
        <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-green-200">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-8 h-8 text-green-600" />
              <CardTitle className="text-xl">Dataset Stats</CardTitle>
            </div>
            <CardDescription>
              Quick overview of available data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Formulations:</span>
              <span className="font-medium text-gray-800">1,092</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Attributes:</span>
              <span className="font-medium text-gray-800">28</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* About Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-600" />
            LNP Data Portal
          </CardTitle>
          <CardDescription>
            A standardized platform for lipid nanoparticle formulation intelligence
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-700 leading-relaxed">
            Our LNP Data Portal is a curated open-access database standardizing four-component lipid compositions, curated physicochemical parameters, and nucleic acid delivery profiles across diverse gene therapy vectors.
          </p>
          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-gray-800">Data Categories</h4>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                <li>Four-component lipid molar ratios (Ionizable, PEG, Sterol, Helper)</li>
                <li>Standardized hydrodynamic size, PDI, and surface zeta potential distributions</li>
                <li>Multi-metric loading capacity (N/P, weight ratio, concentration)</li>
                <li>Calibrated encapsulation efficiency metrics</li>
                <li>Canonical nucleic acid targets (mRNA, siRNA, pDNA, Cas9) and SMILES representations</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-gray-800">Research Applications</h4>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                <li>Formulatory parameter optimization and component trade-off analysis</li>
                <li>Structure-property correlation mapping (colloidal stability, size, and PDI)</li>
                <li>Delivery carrier benchmarks across mRNA and gene editing modalities</li>
                <li>Machine learning-ready feature curation for LNP design workflows</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
