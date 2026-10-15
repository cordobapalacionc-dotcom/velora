import { Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import Footer from './components/Footer.jsx'
import RutaProtegida from './components/RutaProtegida.jsx'
import Home from './pages/Home.jsx'
import SearchResults from './pages/SearchResults.jsx'
import HotelDetail from './pages/HotelDetail.jsx'
import Login from './pages/Login.jsx'
import AdminDashboard from './pages/admin/AdminDashboard.jsx'
import RecepcionDashboard from './pages/recepcion/RecepcionDashboard.jsx'

function App() {
  return (
    <div className="app">
      <Navbar />
      <main className="app__contenido">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/buscar" element={<SearchResults />} />
          <Route path="/hotel/:id" element={<HotelDetail />} />
          <Route path="/iniciar-sesion" element={<Login modoInicial="iniciar" />} />
          <Route path="/crear-cuenta" element={<Login modoInicial="registro" />} />
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
        </Routes>
      </main>
      <Footer />
    </div>
  )
}

export default App
