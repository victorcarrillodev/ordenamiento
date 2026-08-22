import { css } from "remix/ui";
import { colors, FONT_STACK } from "../ui/civic-horizon.ts";

const navbarStyle = css({
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  zIndex: 100,
  background: "rgba(140,29,61,0.96)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  borderBottom: `1px solid rgba(255,255,255,0.1)`,
});

const navInnerStyle = css({
  maxWidth: "1200px",
  margin: "0 auto",
  padding: "0 24px",
  height: "70px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "32px",
});

const navBrandStyle = css({
  display: "flex",
  alignItems: "center",
  gap: "14px",
  textDecoration: "none",
  flexShrink: 0,
});

const navLogoStyle = css({
  width: "42px",
  height: "42px",
  borderRadius: "50%",
  background: `linear-gradient(135deg, ${colors.gold400} 0%, ${colors.gold500} 100%)`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "14px",
  fontWeight: 900,
  color: colors.burgundy900,
  flexShrink: 0,
  boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
});

const navBrandTextStyle = css({
  display: "flex",
  flexDirection: "column",
  "@media (max-width: 600px)": { display: "none" },
});

const navLinksStyle = css({
  display: "flex",
  alignItems: "center",
  gap: "4px",
  "@media (max-width: 768px)": { display: "none" },
});

const navLinkStyle = css({
  textAlign:"center",
  padding: "8px 16px",
  borderRadius: "6px",
  color: "rgba(255,255,255,0.85)",
  fontFamily: FONT_STACK,
  fontSize: "14px",
  fontWeight: 600,
  letterSpacing: "0.04em",
  textDecoration: "none",
  transition: "background 180ms ease, color 180ms ease",
  "&:hover": {
    background: "rgba(255,255,255,0.12)",
    color: colors.white,
  },
});

const navCtaStyle = css({
  padding: "9px 20px",
  borderRadius: "6px",
  background: colors.gold400,
  color: colors.gray950,
  fontFamily: FONT_STACK,
  fontSize: "13px",
  fontWeight: 700,
  letterSpacing: "0.05em",
  textDecoration: "none",
  transition: "background 180ms ease, transform 150ms ease",
  flexShrink: 0,
  "&:hover": {
    background: colors.gold300,
    transform: "translateY(-1px)",
  },
});

export function NavBar() {
  return () => (
    <nav role="navigation" aria-label="Navegación principal" mix={navbarStyle}>
      <div mix={navInnerStyle}>
        {/* Brand */}
        <a
          href="/"
          aria-label="Inicio – Portal de Ordenamiento Territorial"
          mix={navBrandStyle}
        >
          <div mix={navLogoStyle} aria-hidden="true">
            SPT
          </div>
          <div mix={navBrandTextStyle}>
            <span
              mix={css({
                fontFamily: FONT_STACK,
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.65)",
                lineHeight: 1.2,
              })}
            >
              Municipio de San Pedro Tlaquepaque
            </span>
            <span
              mix={css({
                fontFamily: FONT_STACK,
                fontSize: "14px",
                fontWeight: 700,
                color: colors.white,
                lineHeight: 1.3,
              })}
            >
              Ordenamiento Territorial
            </span>
          </div>
        </a>

        {/* Nav links */}
        <div mix={navLinksStyle}>
          <a href="#inicio" mix={navLinkStyle}>
            Inicio
          </a>
          <a href="#que-es" mix={navLinkStyle}>
            El Programa
          </a>
          <a href="#proceso" mix={navLinkStyle}>
            Proceso
          </a>
          <a href="#documentos" mix={navLinkStyle}>
            Documentos
          </a>
          <a href="/poetdum" mix={navLinkStyle}>
            {" "}
            Elaboración del POETDUM
          </a>
        </div>

        {/* CTA */}
        <a href="/participation" id="nav-participar-btn" mix={navCtaStyle}>
          Subir participacion
        </a>
      </div>
    </nav>
  );
}