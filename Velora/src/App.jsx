import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import Footer from './components/Footer.jsx'
import Cargando from './components/Cargando.jsx'
import RutaProtegida from './components/RutaProtegida.jsx'
import Home from './pages/Home.jsx'
import SearchResults from './pages/SearchResults.jsx'
import HotelDetail from './pages/HotelDetail.jsx'
import Login from './pages/Login.jsx'
import NoEncontrada from './pages/NoEncontrada.jsx'

// Páginas que la mayoría de visitantes nunca abre: se descargan solo cuando se necesitan,
// así el sitio público carga más rápido (sobre todo en el celular).
const MisReservas = lazy(() => import('./pages/MisReservas.jsx'))
const Restablecer = lazy(() => import('./pages/Restablecer.jsx'))
const Politicas = lazy(() => import('./pages/Politicas.jsx'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard.jsx'))
const RecepcionDashboard = lazy(() => import('./pages/recepcion/RecepcionDashboard.jsx'))

function App() {
  return (
    <div className="app">
      <Navbar />
      <main className="app__contenido">
        <Suspense fallback={<Cargando />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/buscar" element={<SearchResults />} />
            <Route path="/hotel/:id" element={<HotelDetail />} />
            <Route path="/iniciar-sesion" element={<Login modoInicial="iniciar" />} />
            <Route path="/crear-cuenta" element={<Login modoInicial="registro" />} />
            <Route path="/recuperar" element={<Login modoInicial="recuperar" />} />
            <Route path="/restablecer" element={<Restablecer />} />
            <Route path="/politicas" element={<Politicas />} />
            <Route
              path="/mis-reservas"
              element={
                <RutaProtegida rolesPermitidos={['cliente']}>
                  <MisReservas />
                </RutaProtegida>
              }
            />
            <Route
              path="/admin"
              element={
                <RutaProtegida rolesPermitidos={['admin']}>
                  <AdminDashboard />
                </RutaProtegida>
              }
            />
            <Route
              path="/recepcion"
              element={
                <RutaProtegida rolesPermitidos={['recepcionista']}>
                  <RecepcionDashboard />
                </RutaProtegida>
              }
            />
            <Route path="*" element={<NoEncontrada />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}

export default App
