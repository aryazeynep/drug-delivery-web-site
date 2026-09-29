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
                <CardTitle className="text-xl">LNP Atlas</CardTitle>
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100 ml-auto">
                  Dataset
                </Badge>
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
        <Card className="bg-gradient-to-br from-purple-50 to-pink-100 border-purple-200">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-8 h-8 text-purple-600" />
              <CardTitle className="text-xl">Reference Paper</CardTitle>
            </div>
            <CardDescription>
              Primary source for the LNP Atlas dataset
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm font-medium text-gray-800">
              A Comprehensive Dataset of Lipid Nanoparticle Compositions
            </p>
            <a
              href="https://doi.org/10.1038/s41597-025-06456-w"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-blue-600 hover:underline text-sm"
            >
              <ExternalLink className="w-4 h-4" />
              View on DOI.org
            </a>
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
              <span className="text-gray-600">Total Entries:</span>
              <span className="font-medium text-gray-800">1,284+ LNP compositions</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Columns:</span>
              <span className="font-medium text-gray-800">28 attributes</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Publications:</span>
              <span className="font-medium text-gray-800">89 studies</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* About Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-600" />
            About LNP Atlas
          </CardTitle>
          <CardDescription>
            A comprehensive resource for lipid nanoparticle research
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-700 leading-relaxed">
            The LNP Atlas is a curated database containing detailed compositional information, 
            physicochemical properties, and biological performance metrics for lipid nanoparticle 
            formulations used in drug delivery and gene therapy applications.
          </p>
          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-gray-800">Data Categories</h4>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                <li>Ionizable lipid compositions</li>
                <li>Particle size distributions</li>
                <li>Encapsulation efficiency data</li>
                <li>In vivo transfection results</li>
                <li>SMILES molecular structures</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-gray-800">Research Applications</h4>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                <li>mRNA vaccine development</li>
                <li>Gene therapy delivery</li>
                <li>Drug formulation optimization</li>
                <li>Structure-activity relationships</li>
                <li>Comparative analysis</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
