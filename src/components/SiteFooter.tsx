import { Link } from 'react-router-dom'

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <p>ProjectMentor AI — Academic project studio</p>
        <nav aria-label="Footer">
          <Link to="/">Home</Link>
          <Link to="/sign-in">Sign in</Link>
          <Link to="/register">Get started</Link>
        </nav>
      </div>
    </footer>
  )
}
