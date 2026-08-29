/**
 * Portal de Ordenamiento Territorial – Home Page
 * Civic Horizon Design System
 * San Pedro Tlaquepaque, Jalisco
 */
import type { Handle } from 'remix/ui'
import { css } from 'remix/ui'

import {
  bodyLargeProps,
  bodyProps,
  cardProps,
  colors,
  eyebrowProps,
  FONT_STACK,
  headingLProps,
  headingXLProps,
  HERO_IMAGEN_POR_DEFECTO,
  isSafeCssColor,
  isSafeImageUrl,
  sectionContainerProps,
  sectionPaddingProps,
  type ThemeData,
} from '../ui/civic-horizon.ts'
import { Button } from '../ui/button.tsx'
import { Document } from './document.tsx'
import { NavBar } from '../ui/nav-bar.tsx'
import { routes } from '../routes.ts'

const basePath = (process.env.BASE_PATH ?? '/ordena').replace(/\/$/, '')

// ---------------------------------------------------------------------------
export interface HomePageProps {
  theme?: ThemeData
}

export function HomePage(handle: Handle<HomePageProps>) {
  return () => {
    const theme = handle.props.theme
    return (
      <Document>
        <div
          mix={css({
            '& *, & *::before, & *::after': { boxSizing: 'border-box' },
            fontFamily: FONT_STACK,
            margin: 0,
            padding: 0,
          })}
        >
          <NavBar theme={theme} />
          <main id="main-content">
            <HeroSection theme={theme} />
            <WhatIsThisSite theme={theme} />
            <ActionCardsGrid theme={theme} />
            <WhatIsTheProgram theme={theme} />
            <ProcessTimeline theme={theme} />
            <ParticipationCta theme={theme} />
          </main>
          <SiteFooter theme={theme} />
        </div>
      </Document>
    )
  }
}

// ---------------------------------------------------------------------------
// Hero Section with Carousel Support
// ---------------------------------------------------------------------------

const heroStyle = css({
  position: 'relative',
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  paddingTop: '70px',
})

const heroContentStyle = css({
  position: 'relative',
  zIndex: 3,
  maxWidth: '900px',
  margin: '0 auto',
  padding: '80px 24px',
  textAlign: 'center',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '32px',
})

function HeroSection(handle: Handle<{ theme?: ThemeData }>) {
  return () => {
    const { theme } = handle.props
    const u = theme?.usuario || {}
    const c = u.colores || {}
    const img = u.imagenes || {}
    const txt = u.textos || {}

    // Las imágenes acaban dentro de `url(...)` en un atributo `style`: una URL
    // con `)` o comillas cierra la función CSS y deja inyectar reglas nuevas.
    const imagenesDelTema = Array.isArray(img.heroImagenes)
      ? img.heroImagenes.filter(isSafeImageUrl)
      : []
    const rawImgs = imagenesDelTema.length > 0 ? imagenesDelTema : [HERO_IMAGEN_POR_DEFECTO]

    const hasCarousel = rawImgs.length > 1
    // Validado: este valor se interpola sin escapar dentro de un <script> más
    // abajo (ver innerHTML), así que no puede tomarse tal cual del tema.
    const accentColor = isSafeCssColor(c.acento) ? c.acento : colors.gold400

    // Los gradientes salen del mismo panel de Personalización que el acento y
    // acaban dentro de un atributo `style`, donde un `;` basta para inyectar
    // reglas CSS arbitrarias en la portada pública.
    const colorDelTema = (valor: unknown, respaldo: string) =>
      isSafeCssColor(valor) ? valor : respaldo

    const heroOverlay = `linear-gradient(
      160deg,
      ${colorDelTema(c.heroGradienteInicio, 'rgba(15,17,23,0.82)')} 0%,
      ${colorDelTema(c.heroGradienteCentro, 'rgba(140,29,61,0.70)')} 50%,
      ${colorDelTema(c.heroGradienteFin, 'rgba(15,17,23,0.75)')} 100%
    )`

    const cintillo = txt.heroCintillo || 'Bitácora Ambiental · San Pedro Tlaquepaque'
    const titulo =
      txt.heroTitulo || 'Programa de Ordenamiento Ecológico Territorial y de Desarrollo Urbano'
    const tituloResaltado = txt.heroTituloResaltado || 'Ecológico Territorial'
    const subtitulo =
      txt.heroSubtitulo ||
      'Un proceso participativo para planificar el territorio de forma sustentable, preservando nuestro patrimonio natural y construyendo el municipio que merecemos.'
    const btn1Text = txt.heroBtn1 || 'Conoce el programa'
    const btn2Text = txt.heroBtn2 || 'Registra tu participación'

    return (
      <section id="inicio" aria-label="Bienvenida al portal" mix={heroStyle}>
        {/* Slides / Background */}
        <div id="hero-slider" style="position: absolute; inset: 0; z-index: 1;">
          {rawImgs.map((src: string, idx: number) => (
            <div
              key={idx}
              class={`hero-slide slide-${idx}`}
              style={`
                position: absolute;
                inset: 0;
                background-image: url(${src});
                background-size: cover;
                background-position: center 40%;
                background-repeat: no-repeat;
                opacity: ${idx === 0 ? '1' : '0'};
                transition: opacity 1000ms ease-in-out, transform 8000ms ease-out;
                transform: scale(${idx === 0 ? '1.02' : '1'});
              `}
              role="img"
              aria-label={`Vista ${idx + 1}`}
            />
          ))}
        </div>

        {/* Dynamic Overlay */}
        <div
          style={`position: absolute; inset: 0; z-index: 2; background: ${heroOverlay};`}
          aria-hidden="true"
        />

        {/* Carousel controls if 2+ photos */}
        {hasCarousel && (
          <>
            <button
              type="button"
              id="hero-prev-btn"
              aria-label="Foto anterior"
              style="position: absolute; left: 24px; top: 50%; transform: translateY(-50%); z-index: 4; background: rgba(0,0,0,0.35); color: #fff; border: 1px solid rgba(255,255,255,0.25); border-radius: 50%; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; font-size: 20px; cursor: pointer; backdrop-filter: blur(8px); transition: background 200ms ease;"
            >
              ❮
            </button>
            <button
              type="button"
              id="hero-next-btn"
              aria-label="Siguiente foto"
              style="position: absolute; right: 24px; top: 50%; transform: translateY(-50%); z-index: 4; background: rgba(0,0,0,0.35); color: #fff; border: 1px solid rgba(255,255,255,0.25); border-radius: 50%; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; font-size: 20px; cursor: pointer; backdrop-filter: blur(8px); transition: background 200ms ease;"
            >
              ❯
            </button>

            {/* Dots */}
            <div
              id="hero-dots"
              style="position: absolute; bottom: 64px; left: 50%; transform: translateX(-50%); z-index: 4; display: flex; gap: 8px;"
            >
              {rawImgs.map((_: string, idx: number) => (
                <button
                  type="button"
                  class={`hero-dot dot-${idx}`}
                  aria-label={`Ir a foto ${idx + 1}`}
                  style={`
                    width: ${idx === 0 ? '24px' : '8px'};
                    height: 8px;
                    border-radius: 4px;
                    border: none;
                    background: ${idx === 0 ? accentColor : 'rgba(255,255,255,0.45)'};
                    cursor: pointer;
                    transition: all 300ms ease;
                  `}
                />
              ))}
            </div>
          </>
        )}

        {/* Main Content */}
        <div mix={heroContentStyle}>
          {/* Eyebrow bar */}
          <div mix={css({ display: 'flex', alignItems: 'center', gap: '12px' })}>
            <div
              style={`width: 32px; height: 2px; background: ${accentColor};`}
              aria-hidden="true"
            />
            <span
              style={`
                font-family: ${FONT_STACK};
                font-size: 11px;
                font-weight: 700;
                letter-spacing: 0.2em;
                text-transform: uppercase;
                color: ${accentColor};
              `}
            >
              {cintillo}
            </span>
            <div
              style={`width: 32px; height: 2px; background: ${accentColor};`}
              aria-hidden="true"
            />
          </div>

          {/* Main heading */}
          <h1
            mix={css({
              ...headingXLProps,
              margin: 0,
              textAlign: 'center',
            })}
          >
            {titulo.includes(tituloResaltado) ? (
              <>
                {titulo.split(tituloResaltado)[0]}
                <span
                  style={`
                    color: ${accentColor};
                    display: block;
                  `}
                >
                  {tituloResaltado}
                </span>
                {titulo.split(tituloResaltado)[1]}
              </>
            ) : (
              titulo
            )}
          </h1>

          {/* Sub-heading */}
          <p
            mix={css({
              fontFamily: FONT_STACK,
              fontSize: 'clamp(16px, 2.5vw, 20px)',
              lineHeight: 1.65,
              color: 'rgba(255,255,255,0.88)',
              maxWidth: '680px',
              margin: 0,
              textAlign: 'center',
            })}
          >
            {subtitulo}
          </p>

          {/* CTAs */}
          <div
            mix={css({
              display: 'flex',
              gap: '16px',
              flexWrap: 'wrap',
              justifyContent: 'center',
            })}
          >
            <a
              href="#que-es"
              id="hero-conoce-btn"
              style={`
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                padding: 14px 32px;
                border-radius: 6px;
                background: ${accentColor};
                color: #0f1117;
                font-family: ${FONT_STACK};
                font-size: 14px;
                font-weight: 700;
                letter-spacing: 0.08em;
                text-transform: uppercase;
                text-decoration: none;
                box-shadow: 0 8px 24px rgba(0,0,0,0.3);
                transition: transform 150ms ease;
              `}
            >
              {btn1Text}
            </a>
            <a
              href={routes.participation.index.href()}
              id="hero-participa-btn"
              style={`
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                padding: 13px 31px;
                border-radius: 6px;
                background: transparent;
                color: #ffffff;
                font-family: ${FONT_STACK};
                font-size: 14px;
                font-weight: 700;
                letter-spacing: 0.08em;
                text-transform: uppercase;
                text-decoration: none;
                border: 2px solid rgba(255,255,255,0.7);
                transition: background 200ms ease;
              `}
            >
              {btn2Text}
            </a>
          </div>

          {/* Scroll indicator */}
          <div
            aria-hidden="true"
            mix={css({
              position: 'absolute',
              bottom: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
              opacity: 0.6,
            })}
          >
            <span
              style={`
                font-family: ${FONT_STACK};
                font-size: 10px;
                letter-spacing: 0.15em;
                text-transform: uppercase;
                color: rgba(255,255,255,0.7);
              `}
            >
              Explorar
            </span>
          </div>
        </div>

        {/* Carousel Script (if 2+ images) */}
        {hasCarousel && (
          <script
            innerHTML={`
                (function() {
                  var total = ${rawImgs.length};
                  var current = 0;
                  var interval = null;
                  var accent = '${accentColor}';

                  function showSlide(index) {
                    current = (index + total) % total;
                    var slides = document.querySelectorAll('.hero-slide');
                    var dots = document.querySelectorAll('.hero-dot');
                    for (var i = 0; i < slides.length; i++) {
                      slides[i].style.opacity = i === current ? '1' : '0';
                      slides[i].style.transform = i === current ? 'scale(1.02)' : 'scale(1)';
                    }
                    for (var d = 0; d < dots.length; d++) {
                      dots[d].style.width = d === current ? '24px' : '8px';
                      dots[d].style.background = d === current ? accent : 'rgba(255,255,255,0.45)';
                    }
                  }

                  function startTimer() {
                    stopTimer();
                    interval = setInterval(function() {
                      showSlide(current + 1);
                    }, 5000);
                  }

                  function stopTimer() {
                    if (interval) clearInterval(interval);
                  }

                  var prev = document.getElementById('hero-prev-btn');
                  var next = document.getElementById('hero-next-btn');
                  if (prev) {
                    prev.addEventListener('click', function() {
                      showSlide(current - 1);
                      startTimer();
                    });
                  }
                  if (next) {
                    next.addEventListener('click', function() {
                      showSlide(current + 1);
                      startTimer();
                    });
                  }

                  var dotsContainer = document.getElementById('hero-dots');
                  if (dotsContainer) {
                    var allDots = dotsContainer.querySelectorAll('.hero-dot');
                    allDots.forEach(function(dot, idx) {
                      dot.addEventListener('click', function() {
                        showSlide(idx);
                        startTimer();
                      });
                    });
                  }

                  startTimer();
                })();
              `}
          />
        )}
      </section>
    )
  }
}

// ---------------------------------------------------------------------------
// Check Bullet List (lista con viñeta de check en círculo, usada por las
// secciones "¿Qué es este sitio?" y "¿Qué es el Programa?")
// ---------------------------------------------------------------------------

function CheckBulletList(
  handle: Handle<{
    items: readonly string[]
    dotColor: string
    checkColor: string
    textColor: string
    gap?: string
  }>,
) {
  return () => {
    const { items, dotColor, checkColor, textColor, gap = '12px' } = handle.props
    return (
      <div mix={css({ display: 'flex', flexDirection: 'column', gap })}>
        {items.map((item) => (
          <div key={item} mix={css({ display: 'flex', alignItems: 'flex-start', gap: '12px' })}>
            <div
              style={`
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background: ${dotColor};
                flex-shrink: 0;
                margin-top: 2px;
                display: flex;
                align-items: center;
                justify-content: center;
              `}
              aria-hidden="true"
            >
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                <path
                  d="M1 4l3 3 5-6"
                  stroke={checkColor}
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </div>
            <span
              mix={css({
                fontFamily: FONT_STACK,
                fontSize: '15px',
                lineHeight: 1.55,
                color: textColor,
              })}
            >
              {item}
            </span>
          </div>
        ))}
      </div>
    )
  }
}

// ---------------------------------------------------------------------------
// What Is This Site
// ---------------------------------------------------------------------------

function WhatIsThisSite(handle: Handle<{ theme?: ThemeData }>) {
  return () => {
    const { theme } = handle.props
    const u = theme?.usuario || {}
    const c = u.colores || {}
    const img = u.imagenes || {}
    const txt = u.textos || {}

    const primary = c.primario || colors.burgundy900
    const cintillo = txt.queEsCintillo || '¿Qué es este sitio?'
    const titulo = txt.queEsTitulo || 'Tu ventana al ordenamiento territorial del municipio'
    const p1 =
      txt.queEsParrafo1 ||
      'Este portal es la Bitácora Ambiental del Municipio de San Pedro Tlaquepaque — un espacio oficial y transparente donde los ciudadanos, investigadores y funcionarios pueden dar seguimiento al avance del Programa de Ordenamiento Ecológico Territorial y de Desarrollo Urbano.'
    const p2 =
      txt.queEsParrafo2 ||
      'Aquí encontrarás documentos técnicos, calendarios de actividades, las fases del proceso y un mecanismo directo para registrar tus observaciones y participar en la toma de decisiones sobre el territorio que habitamos.'
    const ecoImg = img.imagenEcologia || `${basePath}/images/ecology-split.jpg`

    return (
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
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '80px',
            alignItems: 'center',
            '@media (max-width: 900px)': {
              gridTemplateColumns: '1fr',
              gap: '48px',
            },
          })}
        >
          {/* Text column */}
          <div mix={css({ display: 'flex', flexDirection: 'column', gap: '24px' })}>
            <span
              style={`font-family: ${FONT_STACK}; font-size: 12px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: ${primary};`}
            >
              {cintillo}
            </span>
            <h2 id="que-es-heading" mix={css({ ...headingLProps, margin: 0 })}>
              {titulo}
            </h2>
            <p mix={css({ ...bodyLargeProps, margin: 0 })}>{p1}</p>
            <p mix={css({ ...bodyProps, margin: 0 })}>{p2}</p>

            {/* Feature bullets */}
            <div mix={css({ marginTop: '8px' })}>
              <CheckBulletList
                items={[
                  'Acceso a documentos técnicos oficiales',
                  'Seguimiento de fases y avances del programa',
                  'Participación ciudadana directa y simplificada',
                  'Consulta del calendario de actividades',
                ]}
                dotColor={primary}
                checkColor="white"
                textColor={colors.gray700}
              />
            </div>
          </div>

          {/* Image column */}
          <div
            mix={css({
              position: 'relative',
              borderRadius: '16px',
              overflow: 'hidden',
              aspectRatio: '4/3',
              boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
            })}
          >
            <img
              src={ecoImg}
              alt="Equilibrio ecológico y territorial"
              mix={css({
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              })}
            />
            <div
              mix={css({
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)',
                padding: '32px 24px 20px',
              })}
            >
              <p
                mix={css({
                  fontFamily: FONT_STACK,
                  fontSize: '12px',
                  color: 'rgba(255,255,255,0.8)',
                  margin: 0,
                  letterSpacing: '0.05em',
                })}
              >
                Equilibrio ecológico • Jalisco, México
              </p>
            </div>
          </div>
        </div>
      </section>
    )
  }
}

// ---------------------------------------------------------------------------
// Action Cards Grid
// ---------------------------------------------------------------------------

function ActionCardsGrid(handle: Handle<{ theme?: ThemeData }>) {
  return () => {
    const { theme } = handle.props
    const u = theme?.usuario || {}
    const c = u.colores || {}
    const ico = u.iconos || {}
    const txt = u.textos || {}

    const primary = c.primario || colors.burgundy900
    const secondary = c.secundario || colors.green700
    const accent = c.acento || colors.gold500

    const cards = [
      {
        id: 'card-programa',
        icon: ico.cardPrograma || '🏛️',
        eyebrow: 'Marco normativo',
        title: txt.card1Titulo || 'Conoce el Programa',
        description:
          txt.card1Desc ||
          'Explora los fundamentos legales, objetivos y alcances del Programa de Ordenamiento Ecológico Territorial y de Desarrollo Urbano, y entiende por qué es la base para el uso responsable del territorio municipal.',
        href: '#que-es-el-programa',
        cta: 'Ver programa',
        accent: primary,
      },
      {
        id: 'card-proceso',
        icon: ico.cardProceso || '⚙️',
        eyebrow: 'Metodología',
        title: txt.card2Titulo || 'Conoce el Proceso',
        description:
          txt.card2Desc ||
          'Conoce paso a paso las cinco fases del proceso —diagnóstico, formulación, aprobación, ejecución y evaluación— y cómo se articulan para dar seguimiento continuo al ordenamiento territorial.',
        href: '#proceso',
        cta: 'Ver fases',
        accent: secondary,
      },
      {
        id: 'card-calendario',
        icon: ico.cardCalendario || '📅',
        eyebrow: 'Agenda de participación',
        title: txt.card3Titulo || 'Calendario de Actividades',
        description:
          txt.card3Desc ||
          'Consulta las fechas de talleres, mesas de trabajo, consultas públicas y sesiones técnicas, y entérate con anticipación de cada oportunidad para participar.',
        href: '#calendario',
        cta: 'Ver calendario',
        accent: accent,
      },
      {
        id: 'card-documentos',
        icon: ico.cardDocumentos || '📄',
        eyebrow: 'Repositorio técnico',
        title: txt.card4Titulo || 'Consulta Documentos',
        description:
          txt.card4Desc ||
          'Accede a la memoria técnica, estudios de diagnóstico, cartografía y acuerdos oficiales, y descarga la documentación completa que respalda cada etapa del proceso.',
        href: '#documentos',
        cta: 'Ver documentos',
        accent: colors.burgundy700,
      },
    ]

    return (
      <section
        aria-labelledby="acciones-heading"
        mix={css({ ...sectionPaddingProps, background: colors.white })}
      >
        <div mix={css(sectionContainerProps)}>
          <div
            mix={css({
              textAlign: 'center',
              marginBottom: '64px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
            })}
          >
            <span
              style={`font-family: ${FONT_STACK}; font-size: 12px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: ${primary};`}
            >
              Explora lo que puedes hacer aquí
            </span>
            <h2 id="acciones-heading" mix={css({ ...headingLProps, margin: 0, maxWidth: '600px' })}>
              Todo lo que necesitas para estar informado y participar
            </h2>
          </div>

          <div
            mix={css({
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '24px',
              '@media (max-width: 1024px)': {
                gridTemplateColumns: 'repeat(2, 1fr)',
              },
              '@media (max-width: 600px)': { gridTemplateColumns: '1fr' },
            })}
          >
            {cards.map((card) => (
              <a
                key={card.id}
                id={card.id}
                href={card.href}
                mix={css({
                  ...cardProps,
                  textDecoration: 'none',
                  color: 'inherit',
                  cursor: 'pointer',
                })}
              >
                <div
                  style={`
                    width: 56px;
                    height: 56px;
                    border-radius: 14px;
                    background: ${card.accent}18;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 26px;
                    flex-shrink: 0;
                    border: 1px solid ${colors.gray700};
                  `}
                  aria-hidden="true"
                >
                  {card.icon}
                </div>

                <div
                  mix={css({
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    flex: 1,
                  })}
                >
                  <span
                    style={`
                      font-family: ${FONT_STACK};
                      font-size: 11px;
                      font-weight: 700;
                      letter-spacing: 0.12em;
                      text-transform: uppercase;
                      color: ${card.accent};
                    `}
                  >
                    {card.eyebrow}
                  </span>
                  <h3
                    mix={css({
                      fontFamily: FONT_STACK,
                      fontSize: '17px',
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
                      fontSize: '14px',
                      lineHeight: 1.6,
                      color: colors.gray500,
                      margin: 0,
                    })}
                  >
                    {card.description}
                  </p>
                </div>

                <div
                  style={`
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-family: ${FONT_STACK};
                    font-size: 13px;
                    font-weight: 700;
                    color: ${card.accent};
                    letter-spacing: 0.04em;
                    margin-top: auto;
                  `}
                >
                  {card.cta}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
    )
  }
}

// ---------------------------------------------------------------------------
// What Is The Program
// ---------------------------------------------------------------------------

function WhatIsTheProgram(handle: Handle<{ theme?: ThemeData }>) {
  return () => {
    const { theme } = handle.props
    const u = theme?.usuario || {}
    const c = u.colores || {}
    const img = u.imagenes || {}
    const primary = c.primario || colors.burgundy900
    const accent = c.acento || colors.gold400
    const programaImg = img.imagenPrograma || `${basePath}/images/ecology-split.jpg`

    const preguntas = [
      '¿Qué zonas deben conservarse o protegerse por su valor ambiental?',
      '¿Dónde es adecuado el crecimiento y desarrollo urbano del municipio?',
      '¿Qué tipo de actividades pueden desarrollarse en las distintas zonas del territorio?',
      '¿En qué condiciones deben realizarse estas actividades para evitar impactos negativos en el ambiente y el entorno urbano?',
    ]

    return (
      <section
        id="que-es-el-programa"
        aria-labelledby="programa-heading"
        mix={css({
          ...sectionPaddingProps,
          background: `linear-gradient(135deg, ${colors.gray900} 0%, ${primary} 100%)`,
          position: 'relative',
          overflow: 'hidden',
        })}
      >
        {/* Decorative circles */}
        <div
          aria-hidden="true"
          mix={css({
            position: 'absolute',
            top: '-120px',
            right: '-120px',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: `radial-gradient(circle, rgba(201,162,39,0.15) 0%, transparent 70%)`,
            pointerEvents: 'none',
          })}
        />
        <div
          aria-hidden="true"
          mix={css({
            position: 'absolute',
            bottom: '-80px',
            left: '-80px',
            width: '300px',
            height: '300px',
            borderRadius: '50%',
            background: `radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)`,
            pointerEvents: 'none',
          })}
        />

        <div mix={css({ ...sectionContainerProps, position: 'relative', zIndex: 1 })}>
          <span
            mix={css({ ...eyebrowProps, color: accent, display: 'block', marginBottom: '16px' })}
          >
            ¿Qué es el Programa?
          </span>
          <h2
            id="programa-heading"
            mix={css({
              ...headingLProps,
              color: colors.white,
              margin: '0 0 40px',
              maxWidth: '820px',
            })}
          >
            ¿Qué es el Programa de Ordenamiento Ecológico Territorial y de Desarrollo Urbano?
          </h2>

          <div
            mix={css({
              display: 'grid',
              gridTemplateColumns: '1.1fr 0.9fr',
              gap: '64px',
              alignItems: 'start',
              '@media (max-width: 900px)': {
                gridTemplateColumns: '1fr',
                gap: '40px',
              },
            })}
          >
            {/* Left: descripción + preguntas que resuelve */}
            <div mix={css({ display: 'flex', flexDirection: 'column', gap: '20px' })}>
              <p
                mix={css({
                  fontFamily: FONT_STACK,
                  fontSize: '17px',
                  lineHeight: 1.75,
                  color: 'rgba(255,255,255,0.78)',
                  margin: 0,
                })}
              >
                Es una herramienta que permite organizar el territorio del municipio, definiendo qué
                actividades pueden realizarse en cada zona y en qué condiciones, con el objetivo de
                proteger el medio ambiente y orientar el desarrollo urbano de manera ordenada.
              </p>
              <p
                mix={css({
                  fontFamily: FONT_STACK,
                  fontSize: '16px',
                  lineHeight: 1.75,
                  color: 'rgba(255,255,255,0.72)',
                  margin: 0,
                })}
              >
                Para elaborarlo se analizan las características del territorio, sus recursos
                naturales y las actividades que se desarrollan en él, con el propósito de encontrar
                un equilibrio entre la protección del medio ambiente y el desarrollo urbano del
                municipio. A partir de este análisis se busca responder preguntas como:
              </p>

              <div mix={css({ marginTop: '4px' })}>
                <CheckBulletList
                  items={preguntas}
                  dotColor={accent}
                  checkColor={colors.gray900}
                  textColor="rgba(255,255,255,0.85)"
                  gap="14px"
                />
              </div>
            </div>

            {/* Right: imagen + cierre */}
            <div mix={css({ display: 'flex', flexDirection: 'column', gap: '24px' })}>
              <div
                mix={css({
                  position: 'relative',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  aspectRatio: '4/3',
                  border: '1px solid rgba(255,255,255,0.12)',
                })}
              >
                <img
                  src={programaImg}
                  alt="Equipo de trabajo planeando el ordenamiento del territorio"
                  mix={css({
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                  })}
                />
              </div>
              <p
                mix={css({
                  fontFamily: FONT_STACK,
                  fontSize: '15px',
                  lineHeight: 1.75,
                  color: 'rgba(255,255,255,0.7)',
                  margin: 0,
                })}
              >
                Una vez aprobado, el Programa establece los criterios y lineamientos que orientan el
                uso, ocupación y aprovechamiento del territorio, así como las reglas que guiarán el
                desarrollo urbano del municipio.
              </p>
            </div>
          </div>
        </div>
      </section>
    )
  }
}

// ---------------------------------------------------------------------------
// Process Timeline
// ---------------------------------------------------------------------------

interface TimelineStep {
  number: string
  title: string
  description: string
  color: string
}

function getTimelineSteps(primary: string, accent: string, secondary: string): TimelineStep[] {
  return [
    {
      number: '01',
      title: 'Formulación',
      description:
        'Diagnóstico territorial, caracterización del área y elaboración de la propuesta inicial del programa con participación ciudadana.',
      color: primary,
    },
    {
      number: '02',
      title: 'Expedición',
      description:
        'Consulta pública, revisión técnica, aprobación por el Ayuntamiento y publicación oficial del programa en el Periódico Oficial.',
      color: accent,
    },
    {
      number: '03',
      title: 'Ejecución',
      description:
        'Implementación de acciones, programas e instrumentos para materializar los lineamientos del ordenamiento territorial.',
      color: secondary,
    },
    {
      number: '04',
      title: 'Evaluación',
      description:
        'Monitoreo de indicadores, revisión periódica de avances y verificación del cumplimiento de metas establecidas.',
      color: colors.gray700,
    },
    {
      number: '05',
      title: 'Modificación',
      description:
        'Actualización del programa con base en nuevas condiciones territoriales, ambientales o socioeconómicas del municipio.',
      color: primary,
    },
  ]
}

function ProcessTimeline(handle: Handle<{ theme?: ThemeData }>) {
  return () => {
    const { theme } = handle.props
    const u = theme?.usuario || {}
    const c = u.colores || {}
    const primary = c.primario || colors.burgundy900
    const accent = c.acento || colors.gold500
    const secondary = c.secundario || colors.green700
    const steps = getTimelineSteps(primary, accent, secondary)

    return (
      <section
        id="proceso"
        aria-labelledby="proceso-heading"
        mix={css({ ...sectionPaddingProps, background: c.secundario || colors.gray50 })}
      >
        <div mix={css(sectionContainerProps)}>
          <div
            mix={css({
              textAlign: 'center',
              marginBottom: '72px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
            })}
          >
            <span mix={css({ ...eyebrowProps, color: primary })}>Fases del proceso</span>
            <h2 id="proceso-heading" mix={css({ ...headingLProps, margin: 0, maxWidth: '560px' })}>
              Cinco etapas hacia un territorio ordenado y sustentable
            </h2>
          </div>

          <div
            mix={css({
              position: 'relative',
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              '@media (max-width: 900px)': { gridTemplateColumns: '1fr' },
            })}
          >
            {/* Connector line (desktop only) */}
            <div
              aria-hidden="true"
              mix={css({
                position: 'absolute',
                top: '28px',
                left: 'calc(10% + 28px)',
                right: 'calc(10% + 28px)',
                height: '2px',
                background: `linear-gradient(to right, ${primary}, ${accent}, ${secondary}, ${colors.gray300}, ${primary})`,
                zIndex: 0,
                '@media (max-width: 900px)': { display: 'none' },
              })}
            />

            {steps.map((step, i) => (
              <TimelineStepCard key={step.number} step={step} isLast={i === steps.length - 1} />
            ))}
          </div>
        </div>
      </section>
    )
  }
}

function TimelineStepCard(handle: Handle<{ step: TimelineStep; isLast: boolean }>) {
  return () => {
    const { step, isLast } = handle.props
    return (
      <div
        mix={css({
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px',
          padding: '0 12px',
          position: 'relative',
          zIndex: 1,
          '@media (max-width: 900px)': {
            flexDirection: 'row',
            alignItems: 'flex-start',
            padding: '0 0 40px 0',
            gap: '24px',
          },
        })}
      >
        <div
          mix={css({
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: step.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: `0 4px 16px ${step.color}55`,
            border: '3px solid white',
          })}
          aria-hidden="true"
        >
          <span
            mix={css({
              fontFamily: FONT_STACK,
              fontSize: '14px',
              fontWeight: 800,
              color: colors.white,
            })}
          >
            {step.number}
          </span>
        </div>

        <div
          mix={css({
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            textAlign: 'center',
            '@media (max-width: 900px)': { textAlign: 'left' },
          })}
        >
          <h3
            mix={css({
              fontFamily: FONT_STACK,
              fontSize: '15px',
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
              fontSize: '13px',
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
              display: 'none',
              '@media (max-width: 900px)': {
                display: 'block',
                position: 'absolute',
                top: '56px',
                left: '27px',
                width: '2px',
                bottom: 0,
                background: `linear-gradient(to bottom, ${step.color}, transparent)`,
              },
            })}
          />
        )}
      </div>
    )
  }
}

// ---------------------------------------------------------------------------
// Participation CTA Banner
// ---------------------------------------------------------------------------

function ParticipationCta(handle: Handle<{ theme?: ThemeData }>) {
  return () => {
    const { theme } = handle.props
    const u = theme?.usuario || {}
    const c = u.colores || {}
    const primary = c.primario || colors.burgundy900
    const accent = c.acento || colors.gold400

    const colorDelTema = (valor: unknown, respaldo: string) =>
      isSafeCssColor(valor) ? valor : respaldo

    const ctaGradient = `linear-gradient(
      135deg,
      ${colorDelTema(c.heroGradienteInicio, primary)} 0%,
      ${colorDelTema(c.heroGradienteCentro, colors.gray900)} 50%,
      ${colorDelTema(c.heroGradienteFin, colors.gray900)} 100%
    )`

    return (
      <section
        aria-labelledby="participa-heading"
        mix={css({
          background: ctaGradient,
          padding: '96px 24px',
          position: 'relative',
          overflow: 'hidden',
        })}
      >
        <div
          aria-hidden="true"
          mix={css({
            position: 'absolute',
            inset: 0,
            backgroundImage: `radial-gradient(circle at 20% 50%, rgba(201,162,39,0.12) 0%, transparent 50%),
                            radial-gradient(circle at 80% 50%, rgba(255,255,255,0.05) 0%, transparent 40%)`,
            pointerEvents: 'none',
          })}
        />

        <div
          mix={css({
            ...sectionContainerProps,
            position: 'relative',
            zIndex: 1,
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '32px',
          })}
        >
          <div
            aria-hidden="true"
            mix={css({
              width: '72px',
              height: '72px',
              borderRadius: '20px',
              background: `rgba(201,162,39,0.15)`,
              border: `1px solid rgba(201,162,39,0.3)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
            })}
          >
            ✍️
          </div>

          <span mix={css({ ...eyebrowProps, color: accent })}>Participación ciudadana</span>

          <h2
            id="participa-heading"
            mix={css({
              ...headingLProps,
              color: colors.white,
              margin: 0,
              maxWidth: '640px',
            })}
          >
            Tu voz transforma el territorio de Tlaquepaque
          </h2>

          <p
            mix={css({
              fontFamily: FONT_STACK,
              fontSize: '18px',
              lineHeight: 1.7,
              color: 'rgba(255,255,255,0.75)',
              maxWidth: '560px',
              margin: 0,
            })}
          >
            Registra tus observaciones, propuestas y documentos técnicos. Tu participación es
            fundamental para construir el Programa de Ordenamiento que refleje las necesidades
            reales del municipio.
          </p>

          <div
            mix={css({
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              justifyContent: 'center',
            })}
          >
            {['.PDF', '.SHP', '.JPG', '.DWG'].map((fmt) => (
              <span
                key={fmt}
                mix={css({
                  padding: '4px 12px',
                  borderRadius: '4px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  fontFamily: FONT_STACK,
                  fontSize: '12px',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  color: 'rgba(255,255,255,0.7)',
                })}
              >
                {fmt}
              </span>
            ))}
            <span
              mix={css({
                padding: '4px 12px',
                borderRadius: '4px',
                background: 'rgba(201,162,39,0.15)',
                border: `1px solid rgba(201,162,39,0.3)`,
                fontFamily: FONT_STACK,
                fontSize: '12px',
                fontWeight: 700,
                letterSpacing: '0.1em',
                color: accent,
              })}
            >
              Hasta 220 MB
            </span>
          </div>

          <Button
            href={routes.participation.index.href()}
            id="participa-cta-btn"
            variant="gold"
            size="lg"
            iconRight={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M5 12h14M12 5l7 7-7 7"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            }
          >
            Registra tu participación
          </Button>
        </div>
      </section>
    )
  }
}

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------

function SiteFooter(handle: Handle<{ theme?: ThemeData }>) {
  return () => {
    const { theme } = handle.props
    const u = theme?.usuario || {}
    const c = u.colores || {}
    const img = u.imagenes || {}
    const txt = u.textos || {}

    const footerBg = c.footerFondo || colors.gray950
    const footerText = c.footerTexto || '#ffffff'
    const accent = c.acento || colors.gold400
    const footerLogo = img.logoFooter || ''
    const entidad = txt.footerEntidad || 'Municipio de San Pedro Tlaquepaque'
    const desc =
      txt.footerDesc ||
      'Portal oficial de la Bitácora Ambiental del Programa de Ordenamiento Ecológico Territorial y de Desarrollo Urbano.'
    const contacto =
      txt.footerContacto ||
      'Dirección de Medio Ambiente y Ecología\nH. Ayuntamiento de San Pedro Tlaquepaque\nJalisco, México'
    const email = txt.footerEmail || 'ordenamiento@tlaquepaque.gob.mx'
    const copyright =
      txt.footerCopyright ||
      '© 2026 H. Ayuntamiento de San Pedro Tlaquepaque. Todos los derechos reservados.'

    return (
      <footer style={`background: ${footerBg}; color: ${footerText}; padding: 64px 24px 32px;`}>
        <div
          mix={css({
            ...sectionContainerProps,
            display: 'flex',
            flexDirection: 'column',
            gap: '48px',
          })}
        >
          {/* Top row */}
          <div
            mix={css({
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr',
              gap: '48px',
              '@media (max-width: 768px)': {
                gridTemplateColumns: '1fr',
                gap: '40px',
              },
            })}
          >
            {/* Brand column */}
            <div mix={css({ display: 'flex', flexDirection: 'column', gap: '16px' })}>
              <div mix={css({ display: 'flex', alignItems: 'center', gap: '12px' })}>
                {footerLogo ? (
                  <img
                    src={footerLogo}
                    alt="Logo Footer"
                    style="max-height: 44px; max-width: 120px; object-fit: contain;"
                  />
                ) : (
                  <div
                    style={`
                      width: 40px;
                      height: 40px;
                      border-radius: 50%;
                      background: linear-gradient(135deg, ${accent} 0%, #c9a227 100%);
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      font-size: 12px;
                      font-weight: 900;
                      color: #0f1117;
                      flex-shrink: 0;
                    `}
                    aria-hidden="true"
                  >
                    SPT
                  </div>
                )}
                <span
                  style={`
                    font-family: ${FONT_STACK};
                    font-size: 15px;
                    font-weight: 700;
                    color: ${footerText};
                  `}
                >
                  {entidad}
                </span>
              </div>
              <p
                style={`
                  font-family: ${FONT_STACK};
                  font-size: 14px;
                  line-height: 1.7;
                  color: rgba(255,255,255,0.7);
                  margin: 0;
                  max-width: 360px;
                `}
              >
                {desc}
              </p>
            </div>

            {/* Navigation */}
            <div mix={css({ display: 'flex', flexDirection: 'column', gap: '12px' })}>
              <span
                style={`
                  font-family: ${FONT_STACK};
                  font-size: 11px;
                  font-weight: 700;
                  letter-spacing: 0.15em;
                  text-transform: uppercase;
                  color: rgba(255,255,255,0.5);
                `}
              >
                Navegación
              </span>
              {[
                { label: 'Inicio', href: routes.home.href() },
                { label: 'El Programa', href: '#que-es-el-programa' },
                { label: 'El Proceso', href: '#proceso' },
                { label: 'Documentos', href: '#documentos' },
                { label: 'Elaboración POETDUM', href: routes.poetdum.show.href() },
              ].map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  style={`
                    font-family: ${FONT_STACK};
                    font-size: 14px;
                    color: rgba(255,255,255,0.7);
                    text-decoration: none;
                    transition: color 150ms ease;
                  `}
                >
                  {link.label}
                </a>
              ))}
            </div>

            {/* Contact */}
            <div mix={css({ display: 'flex', flexDirection: 'column', gap: '12px' })}>
              <span
                style={`
                  font-family: ${FONT_STACK};
                  font-size: 11px;
                  font-weight: 700;
                  letter-spacing: 0.15em;
                  text-transform: uppercase;
                  color: rgba(255,255,255,0.5);
                `}
              >
                Contacto
              </span>
              <p
                style={`
                  font-family: ${FONT_STACK};
                  font-size: 14px;
                  line-height: 1.7;
                  color: rgba(255,255,255,0.7);
                  margin: 0;
                  white-space: pre-line;
                `}
              >
                {contacto}
              </p>
              <a
                href={`mailto:${email}`}
                style={`
                  font-family: ${FONT_STACK};
                  font-size: 14px;
                  color: ${accent};
                  text-decoration: none;
                `}
              >
                {email}
              </a>
            </div>
          </div>

          {/* Divider */}
          <div style="height: 1px; background: rgba(255,255,255,0.12);" aria-hidden="true" />

          {/* Bottom bar */}
          <div
            mix={css({
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
            })}
          >
            <p
              style={`
                font-family: ${FONT_STACK};
                font-size: 13px;
                color: rgba(255,255,255,0.55);
                margin: 0;
              `}
            >
              {copyright}
            </p>
            <p
              style={`
                font-family: ${FONT_STACK};
                font-size: 13px;
                color: rgba(255,255,255,0.55);
                margin: 0;
              `}
            >
              Portal de Ordenamiento Territorial · Bitácora Ambiental
            </p>
          </div>
        </div>
      </footer>
    )
  }
}
