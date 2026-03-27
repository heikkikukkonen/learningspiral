"use client";

import { NoemaLoader } from "@/app/components/noema-loader";

type IdeaNetworkLoaderProps = {
  label?: string;
  detail?: string;
  variant?: "inline" | "panel";
};

export function IdeaNetworkLoader({
  label = "Käsittelen ajatusta",
  detail,
  variant = "inline"
}: IdeaNetworkLoaderProps) {
  return <NoemaLoader label={label} detail={detail} variant={variant} />;
}
