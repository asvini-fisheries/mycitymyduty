import { CrudPage } from "@/components/crud/CrudPage";
import { CertificatePrintBar } from "@/components/crud/CertificatePrintBar";
import { crudConfigs } from "@/lib/crud-configs";

export default function Page() {
  return (
    <CrudPage
      {...crudConfigs.projectMemberParticipations}
      printVoucher="certificate"
      pageSize={25}
      beforeTable={<CertificatePrintBar />}
    />
  );
}
