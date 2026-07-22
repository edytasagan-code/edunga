import Dashboard from "@/app/components/dashboard/Dashboard";
import HomeBottomBar from "@/app/components/dashboard/HomeBottomBar";
import HomeMuralBackground from "@/app/components/dashboard/HomeMuralBackground";
import HomeTopBar from "@/app/components/dashboard/HomeTopBar";

import "./home.css";

export default function HomePage() {
  return (
    <div className="home-page">
      <HomeMuralBackground />
      <div className="home-page__atmosphere" aria-hidden />
      <HomeTopBar />
      <aside className="home-page__nav" aria-label="Nawigacja">
        <Dashboard />
      </aside>
      <HomeBottomBar />
    </div>
  );
}
