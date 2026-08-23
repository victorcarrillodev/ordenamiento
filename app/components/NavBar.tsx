import { css } from "remix/ui";
import { colors, FONT_STACK } from "../ui/civic-horizon.ts";
const navbarStyle = css({
  
  alignItems:"center",
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  zIndex: 100,
  background: "rgba(255,255,255,255)",
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

const containerLogo=css({ 
})


const ImgLogo = css({
  backgroundImage: `url(https://ordenamiento.tlaquepaque.gob.mx/img/image5.png)`,
  backgroundSize: "contain",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "center",
  backgroundColor: "rgba(253 251 251 / 0.95)",
  borderRadius: "8px",
  padding: "6px 10px",
  width: "170px",
  height: "60px",
  boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
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
  color:"black",
  textAlign:"center",
  padding: "8px 16px",
  borderRadius: "6px",
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
  background:"black",
  color: "white",
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
      
      <div mix={containerLogo}>
            <div mix={ImgLogo} role="img"
        aria-label=" Tlaquepaque"></div>
          <div mix={navBrandTextStyle}>
      </div>
 
          </div>
        </a>

        {/* Nav links */}
        <div mix={navLinksStyle}>
          <a href="/" mix={navLinkStyle}>
            Inicio  y proceso
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