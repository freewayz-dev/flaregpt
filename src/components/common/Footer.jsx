import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export default function Footer() {
  const { t } = useTranslation();
  const [year, setYear] = useState(2026);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  return (
    <footer className="">
    <div className="mx-auto max-w-[1440px] px-6 py-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            {/* Copyright Text - Light: Secondary (#475569) | Dark: Secondary (#A1A1AA) */}
            <p className="text-[10px] font-medium text-[#475569] dark:text-[#A1A1AA]">
              {t("footer.copyright", { year })}
            </p>
            {/* Disclaimer Text - Light: Muted (#94A3B8) | Dark: Muted (#71717A) */}
            <p className="text-[10px] leading-relaxed text-[#94A3B8] dark:text-[#71717A] max-w-md">
              {t("footer.disclaimer")}
            </p>
          </div>

          {/* Links - Light: Secondary (#475569) | Dark: Secondary (#A1A1AA) */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-[#475569] dark:text-[#A1A1AA] select-none">
           <a
                href="https://x.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 hover:text-[#E62058] dark:hover:text-[#E62058] transition-colors group"
                aria-label="X (formerly Twitter)"
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="h-3 w-3 fill-current text-[#475569] dark:text-[#A1A1AA] group-hover:text-[#E62058] transition-colors"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
            {/* Divider Dot - Light: Divider (#E5E7EB) | Dark: Divider (#1D1D20) */}
         
            <a
              href="/terms"
              className="hover:text-[#E62058] dark:hover:text-[#E62058] text-[10px] transition duration-150 ease-out"
            >
              {t("footer.terms")}
            </a>

             <button
                type="button"
                onClick={() => navigate("/app/donate")}
                className="inline-flex items-center text-[10px] gap-1 text-[#E62058] hover:text-[#F03A6F] transition-colors cursor-pointer"
              >
                <span>Donate</span>
                <span className="text-[8px] px-1 rounded bg-[#E62058]/10">
                  ♥
                </span>
              </button>
          </div>
        </div>
      </div>
    </footer>
  );
}