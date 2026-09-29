"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Database,
  ChevronDown,
  ChevronRight,
  Layers,
  Table2,
} from "lucide-react";

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const [datasetsOpen, setDatasetsOpen] = React.useState(true);

  return (
    <div className={cn("flex h-screen w-72 flex-col bg-white border-r", className)}>
      {/* Header */}
      <div className="flex flex-col items-center gap-3 border-b p-6 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="relative w-full bg-white shadow-md rounded-lg p-2">
          <Image
            src="/lab_logo.png"
            alt="Lab Logo"
            width={240}
            height={120}
            className="object-contain w-full h-auto"
            priority
          />
        </div>
        <p className="text-base font-bold text-black mt-1">
          LNP Data Portal
        </p>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4">
        {/* Datasets Section */}
        <div className="px-3 mb-2">
          <Button
            variant="ghost"
            className="w-full justify-between text-gray-500 font-semibold text-xs uppercase tracking-wider hover:bg-blue-50 hover:text-blue-700"
            onClick={() => setDatasetsOpen(!datasetsOpen)}
          >
            <span className="flex items-center gap-2">
              <Layers className="w-4 h-4" />
              Datasets
            </span>
            {datasetsOpen ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </Button>
        </div>

        {datasetsOpen && (
          <nav className="space-y-1 px-2">
            <Link href="/lnp-atlas">
              <Button
                variant="secondary"
                className="w-full justify-start gap-3 h-11 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 font-medium"
              >
                <Table2 className="w-5 h-5" />
                LNP Atlas
              </Button>
            </Link>
          </nav>
        )}
      </div>

      {/* Footer */}
      <div className="border-t p-4">
        <p className="text-xs text-center text-gray-400">
          © 2026 NBI Lab
        </p>
      </div>
    </div>
  );
}
