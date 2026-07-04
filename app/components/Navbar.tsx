import Link from "next/link";


export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-700 bg-[#1E2128]/90 backdrop-blur">
      <div className="mx-auto flex h-24 max-w-7xl items-center justify-between px-10">

        {/* LOGO */}

        <Link href="/" className="flex items-center gap-4">

          <div className="flex h-14 w-14 items-center justify-center">

            <svg
              viewBox="0 0 100 100"
              className="h-16 w-16"
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

          </div>

          <div>

            <h1 className="text-4xl font-extrabold tracking-wide text-white">
              EDUNGA
            </h1>

            <p className="mt-1 text-xs tracking-[0.25em] text-zinc-500">
              KIEDY LOGIKA SPOTYKA WYOBRAŹNIĘ
            </p>

          </div>

        </Link>

        {/* MENU */}

        <nav className="hidden items-center gap-10 text-lg text-zinc-300 md:flex">

          <Link
            href="/uczen"
            className="transition hover:text-[#F7B500]"
          >
            Uczeń
          </Link>

          <Link
            href="/nauczyciel"
            className="transition hover:text-[#F7B500]"
          >
            Nauczyciel
          </Link>

          <Link
            href="/matura"
            className="transition hover:text-[#F7B500]"
          >
            Matura
          </Link>

          <Link
            href="/cennik"
            className="transition hover:text-[#F7B500]"
          >
            Cennik
          </Link>

          <Link
            href="/blog"
            className="transition hover:text-[#F7B500]"
          >
            Blog
          </Link>

          <button className="rounded-xl border border-[#F7B500] px-5 py-2 text-[#F7B500] transition hover:bg-[#F7B500] hover:text-black">
            Zaloguj się
          </button>

        </nav>

      </div>
    </header>
  );
}