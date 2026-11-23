const portalCards = [
  {
    number: "01",
    title: "Parent Portal",
    description: "A dedicated space for parents to follow registrations, learning plans and progress.",
    note: "Parent access"
  },
  {
    number: "02",
    title: "Teacher Portal",
    description: "Tools for educators to view assigned students and support learning activities.",
    note: "Teacher access"
  },
  {
    number: "03",
    title: "Admin Portal",
    description: "A central workspace to manage students, families, teachers and programmes.",
    note: "Administrator access"
  }
];

export default function Home() {
  return (
    <main>
      <nav className="nav">
        <a className="brand" href="/">
          <span className="brand-mark">S</span>
          <span>SWASTHA<span className="brand-light"> LEARNING</span></span>
        </a>
        <span className="nav-tag">LEARNING PORTAL</span>
      </nav>

      <section className="hero">
        <div className="eyebrow"><span className="dot" /> A SUPPORTIVE SPACE TO GROW</div>
        <h1>Every learner deserves<br /><em>the right support.</em></h1>
        <p className="hero-copy">
          Welcome to the Swastha Learning Portal — a dedicated space connecting
          families, teachers and our team around each learner&apos;s journey.
        </p>
        <div className="hero-actions">
          <a className="primary-button" href="#portals">Explore the portal <span>→</span></a>
          <span className="secure-note">A connected learning community</span>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="orb orb-one" />
          <div className="orb orb-two" />
          <div className="art-card">
            <span className="art-spark">✳</span>
            <span className="art-label">LEARN · GROW · THRIVE</span>
            <span className="art-line" />
            <span className="art-small">One step at a time.</span>
          </div>
        </div>
      </section>

      <section className="portals" id="portals">
        <div className="section-heading">
          <div>
            <div className="eyebrow">YOUR WORKSPACE</div>
            <h2>Choose your <em>portal</em></h2>
          </div>
          <p>Access will be enabled after secure sign-in is configured.</p>
        </div>
        <div className="card-grid">
          {portalCards.map((card) => (
            <article className="portal-card" key={card.number}>
              <div className="card-top"><span>{card.number}</span><span className="arrow">↗</span></div>
              <h3>{card.title}</h3>
              <p>{card.description}</p>
              <div className="card-bottom"><span className="card-dot" />{card.note}</div>
            </article>
          ))}
        </div>
      </section>

      <footer>
        <span>© {new Date().getFullYear()} Swastha Learning Portal</span>
        <span>Built for learning, connection and growth.</span>
      </footer>
    </main>
  );
}
