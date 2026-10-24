import { requireSuperAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { UploadForm } from "./upload-form";

export default async function UploadPage() {
  await requireSuperAdmin();

  return (
    <>
      <PageHeader
        title="Import participants"
        description="Upload a spreadsheet with one row per participant. Re-importing updates people by email and keeps their attendance."
      />
      <UploadForm />
    </>
  );
}
