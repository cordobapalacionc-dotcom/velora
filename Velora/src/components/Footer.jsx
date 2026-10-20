import { Link } from 'react-router-dom'
import { colecciones, destinos } from '../pages/data/hotels.js'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__contenido">
        <div className="footer__marca">
          <span className="footer__logo">VELORA</span>
          <p>Hospitalidad selecta para quienes buscan silencio, belleza y servicio impecable.</p>
        </div>

        <div className="footer__columna">
          <h4>Destinos</h4>
          <ul>
            {destinos.map((d) => (
              <li key={d.id}>
                <Link to={`/buscar?destino=${encodeURIComponent(d.nombre)}`}>{d.nombre}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="footer__columna">
          <h4>Colección</h4>
          <ul>
            {colecciones.map((c) => (
              <li key={c.id}>
                <Link to={`/buscar?coleccion=${c.id}`}>{c.nombre}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="footer__columna">
          <h4>Compañía</h4>
          <ul>
            <li>Sobre Velora</li>
            <li>Trabaja con nosotros</li>
            <li>Términos y condiciones</li>
            <li>Contacto</li>
          </ul>
        </div>

        <div className="footer__newsletter">
          <h4>Newsletter</h4>
          <p>Recibe destinos exclusivos antes que nadie.</p>
          <form
            className="footer__newsletter-form"
            onSubmit={(e) => e.preventDefault()}
          >
            <input type="email" placeholder="Tu correo electrónico" required />
            <button type="submit" className="btn btn--dorado">
              Suscribirme
            </button>
          </form>
        </div>
      </div>
      <div className="footer__base">
        <span>© {new Date().getFullYear()} Velora. Todos los derechos reservados.</span>
      </div>
    </footer>
  )
}
