import Dashboard from "@/app/components/dashboard/Dashboard";
import HomeMuralBackground from "@/app/components/dashboard/HomeMuralBackground";

import "./home.css";

export default function HomePage() {
  return (
    <div className="home-page">
      <aside className="home-page__nav" aria-label="Nawigacja">
        <Dashboard />
      </aside>
      <div className="home-page__hero" aria-hidden="true">
        <HomeMuralBackground />
      </div>
    </div>
  );
}
