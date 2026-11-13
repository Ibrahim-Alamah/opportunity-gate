import { useLanguage } from '../../context/LanguageContext.tsx';

export interface FooterProps {
  lastUpdated: string | null;
}

export function Footer({ lastUpdated }: FooterProps) {
  const { t } = useLanguage();

  return (
    <footer className="app-footer">
      <div className="app-footer__inner">
        <p className="app-footer__disclaimer">
          {t.footer.verificationDisclaimer}
        </p>

        <div className="app-footer__meta">
          {lastUpdated ? (
            <p className="app-footer__updated">
              <span>{t.footer.lastUpdatedLabel}</span>{' '}
              <bdi className="ltr-inline" dir="ltr">
                {lastUpdated}
              </bdi>
            </p>
          ) : null}

          <p className="app-footer__copyright">{t.footer.copyrightNotice}</p>
        </div>
      </div>
    </footer>
  );
}
