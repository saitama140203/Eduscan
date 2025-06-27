"use client"

import { Badge } from "@/components/ui/badge"
import { Beaker } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export function ExperimentalFeatureBadge() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="ml-2 bg-yellow-50 text-yellow-800 border-yellow-300 hover:bg-yellow-100">
            <Beaker className="h-3 w-3 mr-1" />
            Experimental
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">This is an experimental feature and may change or be removed in the future.</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
