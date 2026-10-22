import { createContext, useContext, useEffect, useState } from 'react'
import { textos } from '../i18n/textos.js'
import { useCatalogo } from './CatalogoContext.jsx'

const IdiomaContext = createContext(null)
const CLAVE_PREFERENCIAS = 'velora_preferencias'
export const IDIOMAS = ['es', 'en']
export const MONEDAS = ['COP', 'USD']

// Preferencias de quien mira el sitio. Si el navegador no deja guardarlas, igual funciona (no se recuerdan).
function leerPreferencias() {
  const porDefecto = { idioma: navigator.language?.toLowerCase().startsWith('en') ? 'en' : 'es', moneda: 'COP' }
  try {
    const guardadas = JSON.parse(localStorage.getItem(CLAVE_PREFERENCIAS))
    return {
      idioma: IDIOMAS.includes(guardadas?.idioma) ? guardadas.idioma : porDefecto.idioma,
      moneda: MONEDAS.includes(guardadas?.moneda) ? guardadas.moneda : porDefecto.moneda,
    }
  } catch {
    return porDefecto
  }
}

const LOCALES = { es: 'es-CO', en: 'en-US' }
const formatoCop = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
const formatoUsd = { es: new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }), en: new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }) }

// Errores del backend que se pueden decir en inglés sin perder información.
const ERRORES_EN = {
  RED: 'Could not connect to the server. Please try again in a moment.',
  CUENTA_BLOQUEADA: 'For your security, this account is temporarily locked after several failed attempts. Try again later or reset your password.',
  DEMASIADOS_INTENTOS: 'Too many attempts from this connection. Please wait a few minutes.',
  SERVICIO_OCUPADO: 'The system is busy processing other bookings. Please try again in a few seconds.',
  ERROR_INTERNO: 'Something went wrong. Please try again.',
}

export function IdiomaProvider({ children }) {
  const [preferencias, setPreferencias] = useState(leerPreferencias)
  const { configuracion } = useCatalogo()
  const { idioma, moneda } = preferencias
  const locale = LOCALES[idioma]

  useEffect(() => {
    document.documentElement.lang = idioma
    try {
      localStorage.setItem(CLAVE_PREFERENCIAS, JSON.stringify(preferencias))
    } catch {
      // Sin almacenamiento disponible (modo privado estricto): la preferencia dura solo esta visita.
    }
  }, [idioma, preferencias])

  /** Texto de la interfaz. Las {variables} se reemplazan; si falta en inglés, se usa el español. */
  function t(clave, variables) {
    const texto = textos[idioma][clave] ?? textos.es[clave] ?? clave
    if (!variables) return texto
    return texto.replace(/\{(\w+)\}/g, (_, nombre) => String(variables[nombre] ?? ''))
  }

  /** Campo de un dato del catálogo en el idioma actual (si no hay traducción, en español). */
  function tr(objeto, campo) {
    if (!objeto) return ''
    return (idioma !== 'es' && objeto.traducciones?.[idioma]?.[campo]) || objeto[campo]
  }

  /** Precio en la moneda elegida. Se cobra siempre en COP: en USD es una conversión aproximada. */
  function precio(cop, { forzarCop = false } = {}) {
    if (moneda === 'USD' && !forzarCop) return `US$ ${formatoUsd[idioma].format(cop / configuracion.tasaUsd)}`
    return formatoCop.format(cop)
  }

  /** Fecha AAAA-MM-DD (o ISO completa) como texto: estilo 'corta' (12 oct 2026), 'larga' o 'mes'. */
  function fecha(valor, estilo = 'corta') {
    if (!valor) return '—'
    const opciones = {
      corta: { day: 'numeric', month: 'short', year: 'numeric' },
      larga: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
      mes: { month: 'long', year: 'numeric' },
      diaMes: { day: 'numeric', month: 'short' },
    }[estilo]
    const soloFecha = valor.length === 10
    const instante = new Date(soloFecha ? `${valor}T00:00:00Z` : valor)
    return new Intl.DateTimeFormat(locale, { ...opciones, ...(soloFecha ? { timeZone: 'UTC' } : {}) }).format(instante)
  }

  function fechaHora(iso) {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
  }

  /** Mensaje para mostrar de un error de la API. En inglés se traducen los conocidos. */
  function mensajeError(error) {
    if (idioma === 'en' && ERRORES_EN[error?.codigo]) return ERRORES_EN[error.codigo]
    return error?.message ?? t('error.generico')
  }

  const valor = {
    idioma,
    moneda,
    locale,
    tasaUsd: configuracion.tasaUsd,
    cambiarIdioma: (nuevo) => setPreferencias((p) => ({ ...p, idioma: nuevo })),
    cambiarMoneda: (nueva) => setPreferencias((p) => ({ ...p, moneda: nueva })),
    t,
    tr,
    precio,
    fecha,
    fechaHora,
    mensajeError,
  }
  return <IdiomaContext.Provider value={valor}>{children}</IdiomaContext.Provider>
}

export function useIdioma() {
  const contexto = useContext(IdiomaContext)
  if (!contexto) throw new Error('useIdioma debe usarse dentro de un IdiomaProvider')
  return contexto
}
