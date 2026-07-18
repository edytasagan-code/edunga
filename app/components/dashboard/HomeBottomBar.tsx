import "./home-topbar.css";

/** Permanent bottom chrome — EDUNGA logo on the left. */
export default function HomeBottomBar() {
  return (
    <footer className="home-bottombar">
      <div className="home-chrome__brand">
        <div className="home-chrome__logo" aria-hidden>
          <svg
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <polygon
              points="50,5 87,27 87,73 50,95 13,73 13,27"
              stroke="#F7B500"
              strokeWidth="5"
              fill="#FFF8E7"
            />
            <text
              x="50"
              y="58"
              textAnchor="middle"
              fill="#1B2B44"
              fontSize="34"
              fontFamily="Georgia, serif"
              fontWeight="700"
            >
              Σ
            </text>
          </svg>
        </div>
        <span className="home-chrome__name">EDUNGA</span>
      </div>
    </footer>
  );
}
