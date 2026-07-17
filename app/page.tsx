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
      <p
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 99999,
          margin: 0,
          padding: "10px 16px",
          background: "#dc2626",
          color: "#fff",
          fontWeight: 800,
          fontSize: "18px",
          letterSpacing: "0.04em",
          textAlign: "center",
        }}
      >
        MURAL HOME OK — jeśli tego nie widzisz, patrzysz na inny serwer
      </p>
      <aside
        className="home-page__nav"
        aria-label="Nawigacja"
        style={{
          flex: "0 0 50%",
          maxWidth: "50%",
          zIndex: 1,
          background: "transparent",
          paddingTop: "48px",
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
