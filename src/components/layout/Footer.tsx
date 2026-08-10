import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";

import { ROUTES } from "@/config/routes";

export default function Footer() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [year, setYear] = useState(2026);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  return (
    <footer className="pb-3 md:pb-0">
      <div className="mx-auto max-w-[1440px]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between justify-center items-center text-center md:text-left">
          <div className="space-y-1">
            <p className="text-[10px] font-medium text-ink-secondary">
              {t("footer.copyright", { year })}
            </p>
            <p className="text-[10px] leading-relaxed text-ink-muted max-w-md">
              {t("footer.disclaimer")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-ink-secondary select-none">
            <a
              href="https://x.com/Flare_GPT"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-brand dark:hover:text-brand transition-colors group"
              aria-label="X (formerly Twitter)"
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="h-4 w-4 fill-current text-ink-secondary group-hover:text-brand transition-colors"
              >
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>

            <Link
              to={ROUTES.terms}
              className="hover:text-brand dark:hover:text-brand text-[10px] transition duration-150 ease-out"
            >
              {t("footer.terms")}
            </Link>

            <button
              type="button"
              onClick={() => navigate(ROUTES.donate)}
              className="inline-flex items-center text-[10px] gap-1 text-brand hover:text-brand-hover transition-colors cursor-pointer"
            >
              <span>{t("footer.donate")}</span>
              <span className="text-[8px] px-1 rounded bg-brand/10">♥</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
