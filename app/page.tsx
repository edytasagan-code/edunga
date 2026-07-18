import Dashboard from "@/app/components/dashboard/Dashboard";
import HomeMuralBackground from "@/app/components/dashboard/HomeMuralBackground";

import "./home.css";

export default function HomePage() {
  return (
    <div className="home-page">
      <HomeMuralBackground />
      <aside className="home-page__nav" aria-label="Nawigacja">
        <Dashboard />
      </aside>
    </div>
  );
}
