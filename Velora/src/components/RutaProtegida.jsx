import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function RutaProtegida({ rolesPermitidos, children }) {
  const { usuario, estaAutenticado } = useAuth()
  const ubicacion = useLocation()

  if (!estaAutenticado) {
    return <Navigate to="/iniciar-sesion" state={{ desde: ubicacion.pathname }} replace />
  }

  if (rolesPermitidos && !rolesPermitidos.includes(usuario.rol)) {
    return <Navigate to="/" replace />
  }

  return children
}
