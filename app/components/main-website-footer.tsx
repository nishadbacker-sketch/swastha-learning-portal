const logoUrl = "https://storage.googleapis.com/hostinger-agents-public-assets-prod/assets/5e22f354-b41c-4d94-b43f-221d0f2d3db8.jpg";

export default function MainWebsiteFooter() {
  return (
    <footer className="swastha-site-footer" aria-label="Swastha Learning Clinic footer">
      <div className="swastha-site-footer__inner">
        <section className="swastha-site-footer__about" aria-label="Swastha Learning Clinic">
          <a href="https://swasthalearning.com/#top" aria-label="Swastha Learning Clinic home" className="swastha-site-footer__logo-link">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl}
              alt="Swastha Learning Clinic logo"
              width={250}
              height={90}
              loading="lazy"
              className="swastha-site-footer__logo"
            />
          </a>
        </section>

        <nav className="swastha-site-footer__links" aria-label="Footer quick links">
          <h2>Quick Links</h2>
          <ul>
            <li><a href="https://swasthalearning.com/#top">Home</a></li>
            <li><a href="https://swasthalearning.com/#appointment">Book an Assessment</a></li>
            <li><a href="https://swasthalearning.com/#appointment">Appointment Details</a></li>
            <li><a href="https://swasthalearning.com/#faq">FAQs</a></li>
          </ul>
        </nav>

        <section className="swastha-site-footer__contact" aria-label="Contact Swastha Learning Clinic">
          <h2>Contact Us</h2>
          <ul>
            <li><a href="https://wa.me/919249056889" target="_blank" rel="noopener noreferrer">WhatsApp: +91 92490 56889</a></li>
            <li><a href="mailto:support@swasthalearning.com">support@swasthalearning.com</a></li>
            <li>
              <address className="swastha-site-footer__address">
                MXVQ+Q66, Perumbadappu,
                <span>Keralam 679580</span>
              </address>
            </li>
          </ul>
        </section>
      </div>
      <div className="swastha-site-footer__bottom">
        <p>Nurturing Every Ability, Empowering Every Child.</p>
      </div>
    </footer>
  );
}
