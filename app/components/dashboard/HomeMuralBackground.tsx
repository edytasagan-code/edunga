import "./home-mural.css";

/**
 * Full-page environmental mural layer (not a separate panel image).
 * Sits behind the nav content; soft left wash blends into #D3CEC5.
 */
export default function HomeMuralBackground() {
  return (
    <div className="home-mural" aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="home-mural__image"
        src="/images/matematyka-mural-2.png"
        alt=""
      />
      <div className="home-mural__fade" />
    </div>
  );
}
