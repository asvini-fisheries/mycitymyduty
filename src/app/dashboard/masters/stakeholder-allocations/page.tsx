"use client";

import { useState } from "react";
import { AllocationBulkModal } from "@/components/crud/AllocationBulkModal";
import { CrudPage } from "@/components/crud/CrudPage";
import { crudConfigs } from "@/lib/crud-configs";

export default function Page() {
  const [allocateOpen, setAllocateOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <>
      <AllocationBulkModal
        open={allocateOpen}
        onClose={() => setAllocateOpen(false)}
        onSaved={() => setRefreshKey((key) => key + 1)}
      />
      <CrudPage
        key={refreshKey}
        {...crudConfigs.stakeholderProjectAllocations}
        allowCreate={false}
        onAddNew={() => setAllocateOpen(true)}
        addButtonLabel="Add New"
      />
    </>
  );
}
