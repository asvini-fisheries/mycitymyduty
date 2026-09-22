import { CrudPage } from "@/components/crud/CrudPage";
import { crudConfigs } from "@/lib/crud-configs";

export default function Page() {
  return (
    <CrudPage
      {...crudConfigs.projectMemberParticipations}
      printVoucher="certificate"
      pageSize={25}
    />
  );
}
