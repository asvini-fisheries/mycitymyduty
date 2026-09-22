"use client";

import { useState } from "react";
import { AccessRightsBulkModal } from "@/components/crud/AccessRightsBulkModal";
import { CrudPage } from "@/components/crud/CrudPage";
import { crudConfigs } from "@/lib/crud-configs";

export default function Page() {
  const [addOpen, setAddOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <>
      <AccessRightsBulkModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={() => setRefreshKey((key) => key + 1)}
      />
      <CrudPage
        key={refreshKey}
        {...crudConfigs.stakeholderAccessRights}
        allowCreate={false}
        onAddNew={() => setAddOpen(true)}
        addButtonLabel="Add New"
      />
    </>
  );
}
