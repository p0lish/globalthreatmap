"use client";

import { useMapStore } from "@/stores/map-store";
import { Button } from "@/components/ui/button";
import { Flame, Circle, Square } from "lucide-react";
import { cn } from "@/lib/utils";

export function MapControls() {
  const {
    showHeatmap,
    showClusters,
    showWatchboxes,
    toggleHeatmap,
    toggleClusters,
    toggleWatchboxes,
  } = useMapStore();

  return (
    <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-2">
      <div className="flex flex-col gap-1 rounded-lg bg-card/90 p-1.5 backdrop-blur-sm border border-border">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleHeatmap}
          className={cn(
            "h-8 w-8",
            showHeatmap && "bg-primary/20 text-primary"
          )}
          title="Toggle Heatmap"
        >
          <Flame className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleClusters}
          className={cn(
            "h-8 w-8",
            showClusters && "bg-primary/20 text-primary"
          )}
          title="Toggle Clusters"
        >
          <Circle className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleWatchboxes}
          className={cn(
            "h-8 w-8",
            showWatchboxes && "bg-primary/20 text-primary"
          )}
          title="Toggle Watchboxes"
        >
          <Square className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
