import Dashboard from "@/app/components/dashboard/Dashboard";
import HomeMuralBackground from "@/app/components/dashboard/HomeMuralBackground";

import "./home.css";

export default function HomePage() {
  return (
    <div
      className="home-page"
      style={{
        position: "relative",
        display: "flex",
        alignItems: "stretch",
        width: "100%",
        minHeight: "100dvh",
        backgroundColor: "#d3cec5",
      }}
    >
      <aside
        className="home-page__nav"
        aria-label="Nawigacja"
        style={{
          flex: "0 0 50%",
          maxWidth: "50%",
          zIndex: 1,
          background: "transparent",
        }}
      >
        <Dashboard />
      </aside>
      <div
        className="home-page__hero"
        aria-hidden="true"
        style={{
          flex: "0 0 50%",
          maxWidth: "50%",
          minWidth: 0,
          minHeight: "100dvh",
          position: "relative",
          zIndex: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <HomeMuralBackground />
      </div>
    </div>
  );
}
