/**
 * Subtle brand watermark — anchored to the editor card's top-right frame.
 */
export default function EdungaWatermark() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute z-[1] select-none"
      style={{
        top: 12,
        right: 12,
        width: 280,
        opacity: 0.25,
      }}
    >
      <div className="flex items-center justify-end gap-3">
        <svg
          viewBox="0 0 100 100"
          className="h-20 w-20 shrink-0"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <polygon
            points="50,5 87,27 87,73 50,95 13,73 13,27"
            stroke="#F7B500"
            strokeWidth="6"
            fill="transparent"
          />
          <path
            d="M60 25
               H35
               L52 45
               L37 75
               H64"
            stroke="#F7B500"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
        <span
          className="text-3xl font-extrabold tracking-wide"
          style={{ color: "#a1a1aa" }}
        >
          EDUNGA
        </span>
      </div>
    </div>
  );
}
