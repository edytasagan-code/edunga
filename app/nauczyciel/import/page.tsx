import ImportUpload from "@/app/components/import/ImportUpload";

import "./import.css";

export default function Page() {
  return (
    <main className="import-page">
      <div className="import-page__container">
        <ImportUpload />
      </div>
    </main>
  );
}
