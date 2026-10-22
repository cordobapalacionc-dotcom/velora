import { createContext, useContext } from 'react'
import { useConsulta } from '../hooks/useConsulta.js'
import { api } from '../services/api.js'

const CatalogoContext = createContext(null)

// Valores usados mientras llega la configuración del backend (son los mismos que tiene por defecto).
const CONFIGURACION_INICIAL = { tasaUsd: 4000, impuestosPorcentaje: 0.19, tarifaLimpieza: 180000, cancelacionGratisDias: 2, retencionAccesosDias: 90 }

async function cargarCatalogo() {
  const [destinos, colecciones, configuracion] = await Promise.all([
    api.catalogo.destinos(),
    api.catalogo.colecciones(),
    api.catalogo.configuracion(),
  ])
  return { destinos, colecciones, configuracion }
}

/** Destinos, colecciones y reglas públicas: se piden una sola vez para todo el sitio. */
export function CatalogoProvider({ children }) {
  const { datos, error, cargando, recargar } = useConsulta('catalogo', cargarCatalogo)
  const valor = {
    destinos: datos?.destinos ?? [],
    colecciones: datos?.colecciones ?? [],
    configuracion: datos?.configuracion ?? CONFIGURACION_INICIAL,
    cargando,
    error,
    recargar,
  }
  return <CatalogoContext.Provider value={valor}>{children}</CatalogoContext.Provider>
}

export function useCatalogo() {
  const contexto = useContext(CatalogoContext)
  if (!contexto) throw new Error('useCatalogo debe usarse dentro de un CatalogoProvider')
  return contexto
}
