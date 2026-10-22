import { Link } from 'react-router-dom'
import { useCatalogo } from '../context/CatalogoContext.jsx'
import { useIdioma } from '../context/IdiomaContext.jsx'

export default function Footer() {
  const { destinos, colecciones } = useCatalogo()
  const { t, tr } = useIdioma()

  return (
    <footer className="footer">
      <div className="footer__contenido">
        <div className="footer__marca">
          <span className="footer__logo">VELORA</span>
          <p>{t('footer.marca')}</p>
        </div>

        <div className="footer__columna">
          <h4>{t('footer.destinos')}</h4>
          <ul>
            {destinos.map((d) => (
              <li key={d.id}>
                <Link to={`/buscar?destino=${encodeURIComponent(tr(d, 'nombre'))}`}>{tr(d, 'nombre')}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="footer__columna">
          <h4>{t('footer.colecciones')}</h4>
          <ul>
            {colecciones.map((c) => (
              <li key={c.id}>
                <Link to={`/buscar?coleccion=${c.id}`}>{tr(c, 'nombre')}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="footer__columna">
          <h4>{t('footer.ayuda')}</h4>
          <ul>
            <li>
              <Link to="/politicas#cancelacion">{t('footer.cancelacion')}</Link>
            </li>
            <li>
              <Link to="/politicas#privacidad">{t('footer.privacidad')}</Link>
            </li>
            <li>
              <Link to="/recuperar">{t('footer.recuperar')}</Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="footer__base">
        <span>{t('footer.derechos', { anio: new Date().getFullYear() })}</span>
      </div>
    </footer>
  )
}
