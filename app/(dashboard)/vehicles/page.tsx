"use client";

import { useRouter } from "next/navigation";
import { VehicleListPage } from "@/modules/vehicles/vehicles.ui";

export default function VehiclesPage() {
  const router = useRouter();

  return (
    <VehicleListPage
      onSelectVehicle={(id) => router.push(`/vehicles/${id}`)}
    />
  );
}
