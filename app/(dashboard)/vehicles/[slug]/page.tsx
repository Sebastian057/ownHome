"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { VehicleDetailPage } from "@/modules/vehicles/vehicles.ui";

export default function VehicleDetailRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();

  return (
    <VehicleDetailPage
      vehicleId={slug}
      onBack={() => router.push("/vehicles")}
    />
  );
}
