/**
 * Portal de Ordenamiento Territorial – Home Page
 * Civic Horizon Design System
 * San Pedro Tlaquepaque, Jalisco
 */
import type { Handle } from "remix/ui";
import { css } from "remix/ui";

import {
  bodyLargeProps,
  bodyProps,
  btnGoldStyle,
  btnSecondaryStyle,
  cardProps,
  colors,
  eyebrowProps,
  eyebrowStyle,
  FONT_STACK,
  headingLProps,
  headingMProps,
  headingXLProps,
  sectionContainerProps,
  sectionPaddingProps,
} from "../ui/civic-horizon.ts";
import { Document } from "./document.tsx";
import { NavBar } from "../components/NavBar.tsx";

// ---------------------------------------------------------------------------
// Page root
// ---------------------------------------------------------------------------

export function HomePage() {
  return () => (
    <Document>
      <div
        mix={css({
          "& *, & *::before, & *::after": { boxSizing: "border-box" },
          fontFamily: FONT_STACK,
          margin: 0,
          padding: 0,
        })}
      >
        <NavBar />
        <main id="main-content">
          <HeroSection />
          <WhatIsThisSite />
          <ActionCardsGrid />
          <WhatIsTheProgram />
          <ProcessTimeline />
          <ParticipationCta />
        </main>
        <SiteFooter />
      </div>
    </Document>
  );
}

// ---------------------------------------------------------------------------
// NavBar
// ---------------------------------------------------------------------------


// ---------------------------------------------------------------------------
// Hero Section
// ---------------------------------------------------------------------------

const heroStyle = css({
  position: "relative",
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
  paddingTop: "70px",
});

const heroImageStyle = css({
  position: "absolute",
  inset: 0,
  backgroundImage:
    "url(https://imgs.search.brave.com/8f1SgJygGgIrQH2BcZXess4TRcaOtm3FXVfawE9VxRE/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9tZWRp/YS5pc3RvY2twaG90/by5jb20vaWQvMTEy/NTUyNzc3Mi9lcy9m/b3RvL3RsYXF1ZXBh/cXVlLmpwZz9zPTYx/Mng2MTImdz0wJms9/MjAmYz1VU3FwdjNw/OEJxbG9LY0JaY01q/YUdPNkpQWW1Va0xl/N1FYUGx5YVREM1Zz/PQ)",
  backgroundSize: "cover",
  backgroundPosition: "center 40%",
  backgroundRepeat: "no-repeat",
});

const heroOverlayStyle = css({
  position: "absolute",
  inset: 0,
  background: `linear-gradient(
    160deg,
    rgba(15,17,23,0.82) 0%,
    rgba(140,29,61,0.70) 50%,
    rgba(15,17,23,0.75) 100%
  )`,
});

const heroContentStyle = css({
  position: "relative",
  zIndex: 2,
  maxWidth: "900px",
  margin: "0 auto",
  padding: "80px 24px",
  textAlign: "center",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "32px",
});

function HeroSection() {
  return () => (
    <section id="inicio" aria-label="Bienvenida al portal" mix={heroStyle}>
      <div
        mix={heroImageStyle}
        role="img"
        aria-label="Vista aérea de San Pedro Tlaquepaque"
      />
      <div mix={heroOverlayStyle} aria-hidden="true" />

      <div mix={heroContentStyle}>
        {/* Eyebrow bar */}
        <div mix={css({ display: "flex", alignItems: "center", gap: "12px" })}>
          <div
            mix={css({
              width: "32px",
              height: "2px",
              background: colors.gold400,
            })}
            aria-hidden="true"
          />
          <span
            mix={css({
              fontFamily: FONT_STACK,
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: colors.gold400,
            })}
          >
            Bitácora Ambiental · San Pedro Tlaquepaque
          </span>
          <div
            mix={css({
              width: "32px",
              height: "2px",
              background: colors.gold400,
            })}
            aria-hidden="true"
          />
        </div>

        {/* Main heading */}
        <h1
          mix={css({
            ...headingXLProps,
            margin: 0,
            textAlign: "center",
          })}
        >
          Programa de Ordenamiento{" "}
          <span
            mix={css({
              color: colors.gold400,
              display: "block",
              "@media (max-width: 600px)": { display: "inline" },
            })}
          >
            Ecológico Territorial
          </span>{" "}
          y de Desarrollo Urbano
        </h1>

        {/* Sub-heading */}
        <p
          mix={css({
            fontFamily: FONT_STACK,
            fontSize: "clamp(16px, 2.5vw, 20px)",
            lineHeight: 1.65,
            color: "rgba(255,255,255,0.82)",
            maxWidth: "680px",
            margin: 0,
            textAlign: "center",
          })}
        >
          Un proceso participativo para planificar el territorio de forma
          sustentable, preservando nuestro patrimonio natural y construyendo el
          municipio que merecemos.
        </p>

        {/* CTAs */}
        <div
          mix={css({
            display: "flex",
            gap: "16px",
            flexWrap: "wrap",
            justifyContent: "center",
          })}
        >
          <a href="#que-es" id="hero-conoce-btn" mix={btnGoldStyle}>
            Conoce el programa
          </a>
          <a
            href="/participation"
            id="hero-participa-btn"
            mix={btnSecondaryStyle}
          >
            Registra tu participación
          </a>
        </div>

        {/* Scroll indicator */}
        <div
          aria-hidden="true"
          mix={css({
            position: "absolute",
            bottom: "32px",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "8px",
            opacity: 0.6,
            animation: "bounce 2s infinite",
            "@keyframes bounce": {
              "0%, 100%": { transform: "translateX(-50%) translateY(0)" },
              "50%": { transform: "translateX(-50%) translateY(8px)" },
            },
          })}
        >
          <span
            mix={css({
              fontFamily: FONT_STACK,
              fontSize: "10px",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.7)",
            })}
          >
            Explorar
          </span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M12 5v14M5 12l7 7 7-7"
              stroke="rgba(255,255,255,0.7)"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// What Is This Site
// ---------------------------------------------------------------------------

function WhatIsThisSite() {
  return () => (
    <section
      id="que-es"
      aria-labelledby="que-es-heading"
      mix={css({
        ...sectionPaddingProps,
        background: colors.gray50,
      })}
    >
      <div
        mix={css({
          ...sectionContainerProps,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "80px",
          alignItems: "center",
          "@media (max-width: 900px)": {
            gridTemplateColumns: "1fr",
            gap: "48px",
          },
        })}
      >
        {/* Text column */}
        <div
          mix={css({ display: "flex", flexDirection: "column", gap: "24px" })}
        >
          <span mix={css({ ...eyebrowProps, color: colors.burgundy900 })}>
            ¿Qué es este sitio?
          </span>
          <h2 id="que-es-heading" mix={css({ ...headingLProps, margin: 0 })}>
            Tu ventana al ordenamiento territorial del municipio
          </h2>
          <p mix={css({ ...bodyLargeProps, margin: 0 })}>
            Este portal es la <strong>Bitácora Ambiental</strong> del Municipio
            de San Pedro Tlaquepaque — un espacio oficial y transparente donde
            los ciudadanos, investigadores y funcionarios pueden dar seguimiento
            al avance del Programa de Ordenamiento Ecológico Territorial y de
            Desarrollo Urbano.
          </p>
          <p mix={css({ ...bodyProps, margin: 0 })}>
            Aquí encontrarás documentos técnicos, calendarios de actividades,
            las fases del proceso y un mecanismo directo para registrar tus
            observaciones y participar en la toma de decisiones sobre el
            territorio que habitamos.
          </p>

          {/* Feature bullets */}
          <div
            mix={css({
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              marginTop: "8px",
            })}
          >
            {[
              "Acceso a documentos técnicos oficiales",
              "Seguimiento de fases y avances del programa",
              "Participación ciudadana directa y simplificada",
              "Consulta del calendario de actividades",
            ].map((feature) => (
              <div
                key={feature}
                mix={css({
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                })}
              >
                <div
                  mix={css({
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    background: colors.burgundy900,
                    flexShrink: 0,
                    marginTop: "2px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  })}
                  aria-hidden="true"
                >
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path
                      d="M1 4l3 3 5-6"
                      stroke="white"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </div>
                <span
                  mix={css({
                    fontFamily: FONT_STACK,
                    fontSize: "15px",
                    lineHeight: 1.5,
                    color: colors.gray700,
                  })}
                >
                  {feature}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Image column */}
        <div
          mix={css({
            position: "relative",
            borderRadius: "16px",
            overflow: "hidden",
            aspectRatio: "4/3",
            boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
          })}
        >
          <img
            src="/images/ecology-split.jpg"
            alt="División entre ecosistema verde y zona árida de Jalisco, representando el equilibrio ecológico"
            mix={css({
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            })}
          />
          <div
            mix={css({
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              background:
                "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)",
              padding: "32px 24px 20px",
            })}
          >
            <p
              mix={css({
                fontFamily: FONT_STACK,
                fontSize: "12px",
                color: "rgba(255,255,255,0.8)",
                margin: 0,
                letterSpacing: "0.05em",
              })}
            >
              Equilibrio ecológico • Jalisco, México
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Action Cards Grid
// ---------------------------------------------------------------------------

interface ActionCard {
  id: string;
  icon: string;
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  cta: string;
  accent: string;
}

const ACTION_CARDS: ActionCard[] = [
  {
    id: "card-programa",
    icon: "🏛️",
    eyebrow: "Marco normativo",
    title: "Conoce el Programa",
    description:
      "Explora los fundamentos legales, objetivos y alcances del Programa de Ordenamiento Ecológico Territorial y de Desarrollo Urbano.",
    href: "#que-es-el-programa",
    cta: "Ver programa",
    accent: colors.burgundy900,
  },
  {
    id: "card-proceso",
    icon: "⚙️",
    eyebrow: "Metodología",
    title: "Conoce el Proceso",
    description:
      "Entiende las cinco fases del proceso: desde la formulación hasta la evaluación continua del ordenamiento territorial.",
    href: "#proceso",
    cta: "Ver fases",
    accent: colors.green700,
  },
  {
    id: "card-calendario",
    icon: "📅",
    eyebrow: "Agenda de participación",
    title: "Calendario de Actividades",
    description:
      "Consulta las fechas de talleres, mesas de trabajo, consultas públicas y sesiones técnicas del programa.",
    href: "#calendario",
    cta: "Ver calendario",
    accent: colors.gold500,
  },
  {
    id: "card-documentos",
    icon: "📄",
    eyebrow: "Repositorio técnico",
    title: "Consulta Documentos",
    description:
      "Accede a la memoria técnica, estudios de diagnóstico, cartografía y acuerdos oficiales del proceso de ordenamiento.",
    href: "#documentos",
    cta: "Ver documentos",
    accent: colors.gray700,
  },
];

function ActionCardsGrid() {
  return () => (
    <section
      aria-labelledby="acciones-heading"
      mix={css({ ...sectionPaddingProps, background: colors.white })}
    >
      <div mix={css(sectionContainerProps)}>
        <div
          mix={css({
            textAlign: "center",
            marginBottom: "64px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "16px",
          })}
        >
          <span mix={css({ ...eyebrowProps, color: colors.burgundy900 })}>
            Explora lo que puedes hacer aquí
          </span>
          <h2
            id="acciones-heading"
            mix={css({ ...headingLProps, margin: 0, maxWidth: "600px" })}
          >
            Todo lo que necesitas para estar informado y participar
          </h2>
        </div>

        <div
          mix={css({
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "24px",
            "@media (max-width: 1024px)": {
              gridTemplateColumns: "repeat(2, 1fr)",
            },
            "@media (max-width: 600px)": { gridTemplateColumns: "1fr" },
          })}
        >
          {ACTION_CARDS.map((card) => (
            <a
              key={card.id}
              id={card.id}
              href={card.href}
              mix={css({
                ...cardProps,
                textDecoration: "none",
                color: "inherit",
                cursor: "pointer",
              })}
            >
              <div
                mix={css({
                  width: "56px",
                  height: "56px",
                  borderRadius: "14px",
                  background: `${card.accent}18`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "26px",
                  flexShrink: 0,
                  border: `1px solid ${card.accent}28`,
                })}
                aria-hidden="true"
              >
                {card.icon}
              </div>

              <div
                mix={css({
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  flex: 1,
                })}
              >
                <span
                  mix={css({
                    fontFamily: FONT_STACK,
                    fontSize: "11px",
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: card.accent,
                  })}
                >
                  {card.eyebrow}
                </span>
                <h3
                  mix={css({
                    fontFamily: FONT_STACK,
                    fontSize: "17px",
                    fontWeight: 700,
                    lineHeight: 1.3,
                    color: colors.gray900,
                    margin: 0,
                  })}
                >
                  {card.title}
                </h3>
                <p
                  mix={css({
                    fontFamily: FONT_STACK,
                    fontSize: "14px",
                    lineHeight: 1.6,
                    color: colors.gray500,
                    margin: 0,
                  })}
                >
                  {card.description}
                </p>
              </div>

              <div
                mix={css({
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontFamily: FONT_STACK,
                  fontSize: "13px",
                  fontWeight: 700,
                  color: card.accent,
                  letterSpacing: "0.04em",
                  marginTop: "auto",
                })}
              >
                {card.cta}
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M5 12h14M12 5l7 7-7 7"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// What Is The Program
// ---------------------------------------------------------------------------

function WhatIsTheProgram() {
  return () => (
    <section
      id="que-es-el-programa"
      aria-labelledby="programa-heading"
      mix={css({
        ...sectionPaddingProps,
        background: `linear-gradient(135deg, ${colors.gray900} 0%, ${colors.burgundy900} 100%)`,
        position: "relative",
        overflow: "hidden",
      })}
    >
      {/* Decorative circles */}
      <div
        aria-hidden="true"
        mix={css({
          position: "absolute",
          top: "-120px",
          right: "-120px",
          width: "400px",
          height: "400px",
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(201,162,39,0.15) 0%, transparent 70%)`,
          pointerEvents: "none",
        })}
      />
      <div
        aria-hidden="true"
        mix={css({
          position: "absolute",
          bottom: "-80px",
          left: "-80px",
          width: "300px",
          height: "300px",
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)`,
          pointerEvents: "none",
        })}
      />

      <div
        mix={css({ ...sectionContainerProps, position: "relative", zIndex: 1 })}
      >
        <div
          mix={css({
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "80px",
            alignItems: "start",
            "@media (max-width: 900px)": {
              gridTemplateColumns: "1fr",
              gap: "48px",
            },
          })}
        >
          {/* Left: headline + stats */}
          <div
            mix={css({ display: "flex", flexDirection: "column", gap: "24px" })}
          >
            <span mix={css({ ...eyebrowProps, color: colors.gold400 })}>
              ¿Qué es el Programa?
            </span>
            <h2
              id="programa-heading"
              mix={css({ ...headingLProps, color: colors.white, margin: 0 })}
            >
              Un instrumento de planeación para el territorio y el ambiente
            </h2>
            <p
              mix={css({
                fontFamily: FONT_STACK,
                fontSize: "18px",
                lineHeight: 1.7,
                color: "rgba(255,255,255,0.75)",
                margin: 0,
              })}
            >
              El Programa de Ordenamiento Ecológico Territorial y de Desarrollo
              Urbano es el principal instrumento de política ambiental y urbana
              del Municipio de San Pedro Tlaquepaque.
            </p>

            <div
              mix={css({
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "16px",
                marginTop: "8px",
              })}
            >
              {[
                { value: "5", label: "Fases del proceso" },
                { value: "2026", label: "Año de inicio" },
                { value: "600k+", label: "Habitantes beneficiados" },
                { value: "100%", label: "Participación abierta" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  mix={css({
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "12px",
                    padding: "20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                  })}
                >
                  <span
                    mix={css({
                      fontFamily: FONT_STACK,
                      fontSize: "28px",
                      fontWeight: 800,
                      color: colors.gold400,
                      lineHeight: 1,
                    })}
                  >
                    {stat.value}
                  </span>
                  <span
                    mix={css({
                      fontFamily: FONT_STACK,
                      fontSize: "12px",
                      color: "rgba(255,255,255,0.6)",
                      lineHeight: 1.4,
                    })}
                  >
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: body text + legal basis */}
          <div
            mix={css({ display: "flex", flexDirection: "column", gap: "24px" })}
          >
            <p
              mix={css({
                fontFamily: FONT_STACK,
                fontSize: "16px",
                lineHeight: 1.8,
                color: "rgba(255,255,255,0.72)",
                margin: 0,
              })}
            >
              Establece los lineamientos para el uso del suelo, la protección de
              áreas naturales, la distribución de actividades humanas y la
              gestión sustentable de los recursos naturales en el territorio
              municipal.
            </p>
            <p
              mix={css({
                fontFamily: FONT_STACK,
                fontSize: "16px",
                lineHeight: 1.8,
                color: "rgba(255,255,255,0.72)",
                margin: 0,
              })}
            >
              Su elaboración es participativa: integra las voces de ciudadanos,
              organizaciones civiles, academia y sector productivo, garantizando
              que el resultado refleje las necesidades y aspiraciones colectivas
              del municipio.
            </p>

            <div
              mix={css({
                background: "rgba(201,162,39,0.12)",
                border: `1px solid rgba(201,162,39,0.3)`,
                borderRadius: "12px",
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              })}
            >
              <span
                mix={css({
                  fontFamily: FONT_STACK,
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: colors.gold400,
                })}
              >
                Fundamento legal
              </span>
              <p
                mix={css({
                  fontFamily: FONT_STACK,
                  fontSize: "14px",
                  lineHeight: 1.65,
                  color: "rgba(255,255,255,0.65)",
                  margin: 0,
                })}
              >
                Ley General del Equilibrio Ecológico y la Protección al Ambiente
                · Ley de Ordenamiento Territorial y Desarrollo Urbano del Estado
                de Jalisco · Código Urbano para el Estado de Jalisco
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Process Timeline
// ---------------------------------------------------------------------------

interface TimelineStep {
  number: string;
  title: string;
  description: string;
  color: string;
}

const TIMELINE_STEPS: TimelineStep[] = [
  {
    number: "01",
    title: "Formulación",
    description:
      "Diagnóstico territorial, caracterización del área y elaboración de la propuesta inicial del programa con participación ciudadana.",
    color: colors.burgundy900,
  },
  {
    number: "02",
    title: "Expedición",
    description:
      "Consulta pública, revisión técnica, aprobación por el Ayuntamiento y publicación oficial del programa en el Periódico Oficial.",
    color: colors.gold500,
  },
  {
    number: "03",
    title: "Ejecución",
    description:
      "Implementación de acciones, programas e instrumentos para materializar los lineamientos del ordenamiento territorial.",
    color: colors.green700,
  },
  {
    number: "04",
    title: "Evaluación",
    description:
      "Monitoreo de indicadores, revisión periódica de avances y verificación del cumplimiento de metas establecidas.",
    color: colors.gray700,
  },
  {
    number: "05",
    title: "Modificación",
    description:
      "Actualización del programa con base en nuevas condiciones territoriales, ambientales o socioeconómicas del municipio.",
    color: colors.burgundy800,
  },
];

function ProcessTimeline() {
  return () => (
    <section
      id="proceso"
      aria-labelledby="proceso-heading"
      mix={css({ ...sectionPaddingProps, background: colors.gray50 })}
    >
      <div mix={css(sectionContainerProps)}>
        <div
          mix={css({
            textAlign: "center",
            marginBottom: "72px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "16px",
          })}
        >
          <span mix={css({ ...eyebrowProps, color: colors.burgundy900 })}>
            Fases del proceso
          </span>
          <h2
            id="proceso-heading"
            mix={css({ ...headingLProps, margin: 0, maxWidth: "560px" })}
          >
            Cinco etapas hacia un territorio ordenado y sustentable
          </h2>
        </div>

        <div
          mix={css({
            position: "relative",
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            "@media (max-width: 900px)": { gridTemplateColumns: "1fr" },
          })}
        >
          {/* Connector line (desktop only) */}
          <div
            aria-hidden="true"
            mix={css({
              position: "absolute",
              top: "28px",
              left: "calc(10% + 28px)",
              right: "calc(10% + 28px)",
              height: "2px",
              background: `linear-gradient(to right, ${colors.burgundy900}, ${colors.gold500}, ${colors.green700}, ${colors.gray300}, ${colors.burgundy900})`,
              zIndex: 0,
              "@media (max-width: 900px)": { display: "none" },
            })}
          />

          {TIMELINE_STEPS.map((step, i) => (
            <TimelineStepCard
              key={step.number}
              step={step}
              isLast={i === TIMELINE_STEPS.length - 1}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function TimelineStepCard(
  handle: Handle<{ step: TimelineStep; isLast: boolean }>,
) {
  return () => {
    let { step, isLast } = handle.props;
    return (
      <div
        mix={css({
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "20px",
          padding: "0 12px",
          position: "relative",
          zIndex: 1,
          "@media (max-width: 900px)": {
            flexDirection: "row",
            alignItems: "flex-start",
            padding: "0 0 40px 0",
            gap: "24px",
          },
        })}
      >
        <div
          mix={css({
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            background: step.color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: `0 4px 16px ${step.color}55`,
            border: "3px solid white",
          })}
          aria-hidden="true"
        >
          <span
            mix={css({
              fontFamily: FONT_STACK,
              fontSize: "14px",
              fontWeight: 800,
              color: colors.white,
            })}
          >
            {step.number}
          </span>
        </div>

        <div
          mix={css({
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            textAlign: "center",
            "@media (max-width: 900px)": { textAlign: "left" },
          })}
        >
          <h3
            mix={css({
              fontFamily: FONT_STACK,
              fontSize: "15px",
              fontWeight: 700,
              color: step.color,
              margin: 0,
            })}
          >
            {step.title}
          </h3>
          <p
            mix={css({
              fontFamily: FONT_STACK,
              fontSize: "13px",
              lineHeight: 1.65,
              color: colors.gray500,
              margin: 0,
            })}
          >
            {step.description}
          </p>
        </div>

        {/* Mobile vertical connector */}
        {!isLast && (
          <div
            aria-hidden="true"
            mix={css({
              display: "none",
              "@media (max-width: 900px)": {
                display: "block",
                position: "absolute",
                top: "56px",
                left: "27px",
                width: "2px",
                bottom: 0,
                background: `linear-gradient(to bottom, ${step.color}, transparent)`,
              },
            })}
          />
        )}
      </div>
    );
  };
}

// ---------------------------------------------------------------------------
// Participation CTA Banner
// ---------------------------------------------------------------------------

function ParticipationCta() {
  return () => (
    <section
      aria-labelledby="participa-heading"
      mix={css({
        background: `linear-gradient(135deg, ${colors.burgundy900} 0%, ${colors.gray900} 100%)`,
        padding: "96px 24px",
        position: "relative",
        overflow: "hidden",
      })}
    >
      <div
        aria-hidden="true"
        mix={css({
          position: "absolute",
          inset: 0,
          backgroundImage: `radial-gradient(circle at 20% 50%, rgba(201,162,39,0.12) 0%, transparent 50%),
                            radial-gradient(circle at 80% 50%, rgba(255,255,255,0.05) 0%, transparent 40%)`,
          pointerEvents: "none",
        })}
      />

      <div
        mix={css({
          ...sectionContainerProps,
          position: "relative",
          zIndex: 1,
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "32px",
        })}
      >
        <div
          aria-hidden="true"
          mix={css({
            width: "72px",
            height: "72px",
            borderRadius: "20px",
            background: `rgba(201,162,39,0.15)`,
            border: `1px solid rgba(201,162,39,0.3)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "32px",
          })}
        >
          ✍️
        </div>

        <span mix={css({ ...eyebrowProps, color: colors.gold400 })}>
          Participación ciudadana
        </span>

        <h2
          id="participa-heading"
          mix={css({
            ...headingLProps,
            color: colors.white,
            margin: 0,
            maxWidth: "640px",
          })}
        >
          Tu voz transforma el territorio de Tlaquepaque
        </h2>

        <p
          mix={css({
            fontFamily: FONT_STACK,
            fontSize: "18px",
            lineHeight: 1.7,
            color: "rgba(255,255,255,0.75)",
            maxWidth: "560px",
            margin: 0,
          })}
        >
          Registra tus observaciones, propuestas y documentos técnicos. Tu
          participación es fundamental para construir el Programa de
          Ordenamiento que refleje las necesidades reales del municipio.
        </p>

        <div
          mix={css({
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
            justifyContent: "center",
          })}
        >
          {[".PDF", ".SHP", ".JPG", ".DWG"].map((fmt) => (
            <span
              key={fmt}
              mix={css({
                padding: "4px 12px",
                borderRadius: "4px",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
                fontFamily: FONT_STACK,
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "0.1em",
                color: "rgba(255,255,255,0.7)",
              })}
            >
              {fmt}
            </span>
          ))}
          <span
            mix={css({
              padding: "4px 12px",
              borderRadius: "4px",
              background: "rgba(201,162,39,0.15)",
              border: `1px solid rgba(201,162,39,0.3)`,
              fontFamily: FONT_STACK,
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: "0.1em",
              color: colors.gold300,
            })}
          >
            Hasta 850 MB
          </span>
        </div>

        <a href="/participation" id="participa-cta-btn" mix={btnGoldStyle}>
          Registra tu participación
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M5 12h14M12 5l7 7-7 7"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </a>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------

function SiteFooter() {
  return () => (
    <footer
      mix={css({ background: colors.gray950, padding: "64px 24px 32px" })}
    >
      <div
        mix={css({
          ...sectionContainerProps,
          display: "flex",
          flexDirection: "column",
          gap: "48px",
        })}
      >
        {/* Top row */}
        <div
          mix={css({
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr",
            gap: "48px",
            "@media (max-width: 768px)": {
              gridTemplateColumns: "1fr",
              gap: "40px",
            },
          })}
        >
          {/* Brand column */}
          <div
            mix={css({ display: "flex", flexDirection: "column", gap: "16px" })}
          >
            <div
              mix={css({ display: "flex", alignItems: "center", gap: "12px" })}
            >
              <div
                mix={css({
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  background: `linear-gradient(135deg, ${colors.gold400} 0%, ${colors.gold500} 100%)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                  fontWeight: 900,
                  color: colors.burgundy900,
                  flexShrink: 0,
                })}
                aria-hidden="true"
              >
                SPT
              </div>
              <span
                mix={css({
                  fontFamily: FONT_STACK,
                  fontSize: "14px",
                  fontWeight: 700,
                  color: colors.white,
                })}
              >
                Municipio de San Pedro Tlaquepaque
              </span>
            </div>
            <p
              mix={css({
                fontFamily: FONT_STACK,
                fontSize: "14px",
                lineHeight: 1.7,
                color: colors.gray400,
                margin: 0,
                maxWidth: "360px",
              })}
            >
              Portal oficial de la Bitácora Ambiental del Programa de
              Ordenamiento Ecológico Territorial y de Desarrollo Urbano.
            </p>
          </div>

          {/* Navigation */}
          <div
            mix={css({ display: "flex", flexDirection: "column", gap: "12px" })}
          >
            <span
              mix={css({
                fontFamily: FONT_STACK,
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: colors.gray500,
              })}
            >
              Navegación
            </span>
            {[
              "Inicio",
              "El Programa",
              "El Proceso",
              "Documentos",
              "Calendario",
              ""
            ].map((link) => (
              <a
                key={link}
                href="#"
                mix={css({
                  fontFamily: FONT_STACK,
                  fontSize: "14px",
                  color: colors.gray400,
                  textDecoration: "none",
                  transition: "color 150ms ease",
                  "&:hover": { color: colors.white },
                })}
              >
                {link}
              </a>
            ))}
          </div>

          {/* Contact */}
          <div
            mix={css({ display: "flex", flexDirection: "column", gap: "12px" })}
          >
            <span
              mix={css({
                fontFamily: FONT_STACK,
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: colors.gray500,
              })}
            >
              Contacto
            </span>
            <p
              mix={css({
                fontFamily: FONT_STACK,
                fontSize: "14px",
                lineHeight: 1.7,
                color: colors.gray400,
                margin: 0,
              })}
            >
              Dirección de Medio Ambiente y Ecología
              <br />
              H. Ayuntamiento de San Pedro Tlaquepaque
              <br />
              Jalisco, México
            </p>
            <a
              href="mailto:ordenamiento@tlaquepaque.gob.mx"
              mix={css({
                fontFamily: FONT_STACK,
                fontSize: "14px",
                color: colors.gold400,
                textDecoration: "none",
                "&:hover": { color: colors.gold300 },
              })}
            >
              ordenamiento@tlaquepaque.gob.mx
            </a>
          </div>
        </div>

        {/* Divider */}
        <div
          mix={css({ height: "1px", background: colors.gray800 })}
          aria-hidden="true"
        />

        {/* Bottom bar */}
        <div
          mix={css({
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "16px",
          })}
        >
          <p
            mix={css({
              fontFamily: FONT_STACK,
              fontSize: "13px",
              color: colors.gray500,
              margin: 0,
            })}
          >
            © 2026 H. Ayuntamiento de San Pedro Tlaquepaque. Todos los derechos
            reservados.
          </p>
          <p
            mix={css({
              fontFamily: FONT_STACK,
              fontSize: "13px",
              color: colors.gray500,
              margin: 0,
            })}
          >
            Portal de Ordenamiento Territorial · Bitácora Ambiental
          </p>
        </div>
      </div>
    </footer>
  );
}
