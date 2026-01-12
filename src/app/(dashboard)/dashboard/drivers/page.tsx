import { DashboardHeader } from "@/components/layout";
import { DriverTable } from "@/components/drivers";

export default function DriversPage() {
  return (
    <>
      <DashboardHeader
        title="Drivers"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Drivers" },
        ]}
      />
      <div className="flex flex-1 flex-col gap-8 p-4 md:p-6 lg:p-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Drivers
          </h1>
          <p className="text-muted-foreground">
            Manage your drivers and their availability
          </p>
        </div>

        <DriverTable />
      </div>
    </>
  );
}
