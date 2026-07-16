import DocumentLibraryTable from "@/app/components/document-library/DocumentLibraryTable";

export default function DocumentLibraryPage() {
  return (
    <main className="edunga-page edunga-page--padded min-h-dvh">
      <div className="edunga-page__container mx-auto max-w-[1400px]">
        <DocumentLibraryTable />
      </div>
    </main>
  );
}
