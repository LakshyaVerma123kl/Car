/* eslint-disable @typescript-eslint/no-explicit-any, no-empty, @typescript-eslint/no-unused-vars */
import { useState, useRef, useEffect } from 'react';
import type { CarModel } from './data';
import { cars, formatCurrency } from './data';
import AIWidget from './components/AIWidget';

function App() {
  const [filteredModels, setFilteredModels] = useState<CarModel[]>(cars);
  const [comparisonModels, setComparisonModels] = useState<CarModel[]>(cars.slice(0, 2));
  const [currency, setCurrency] = useState<'INR' | 'USD'>('INR');
  const [highlightedModelId, setHighlightedModelId] = useState<string | null>(null);
  const [bookingData, setBookingData] = useState({ model: '', date: '', city: '' });
  const [scrolled, setScrolled] = useState(false);
  const [themeMode, setThemeMode] = useState<'standard' | 'track'>('standard');

  // Custom Cursor Refs
  const cursorDotRef = useRef<HTMLDivElement>(null);

  // Scroll Observer Refs
  const revealRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    if (themeMode === 'track') {
      document.documentElement.style.setProperty('--color-accent', '#ff003c');
    } else {
      document.documentElement.style.setProperty('--color-accent', '#00ff66');
    }
  }, [themeMode]);

  useEffect(() => {
    // Navbar Scroll
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);

    // Custom Cursor Logic
    const handleMouseMove = (e: MouseEvent) => {
      const { clientX: x, clientY: y } = e;
      if (cursorDotRef.current) {
        cursorDotRef.current.style.transform = `translate(${x}px, ${y}px)`;
      }
    };
    
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (cursorDotRef.current && (target.tagName.toLowerCase() === 'button' || target.tagName.toLowerCase() === 'a' || target.tagName.toLowerCase() === 'input' || target.tagName.toLowerCase() === 'select' || target.closest('button') || target.closest('a'))) {
        cursorDotRef.current.classList.add('hovered');
      } else if (cursorDotRef.current) {
        cursorDotRef.current.classList.remove('hovered');
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseover', handleMouseOver);

    // Intersection Observer for Scroll Reveals
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
        }
      });
    }, { threshold: 0.1 });

    revealRefs.current.forEach(ref => {
      if (ref) observer.observe(ref);
    });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseover', handleMouseOver);
      observer.disconnect();
    };
  }, []);

  const addToRefs = (el: HTMLElement | null) => {
    if (el && !revealRefs.current.includes(el)) {
      revealRefs.current.push(el);
    }
  };

  const heroRef = useRef<HTMLElement>(null);
  const modelsRef = useRef<HTMLElement>(null);
  const comparisonRef = useRef<HTMLElement>(null);
  const bookingRef = useRef<HTMLElement>(null);
  const pricingRef = useRef<HTMLElement>(null);
  const contactRef = useRef<HTMLElement>(null);

  const sectionRefs = {
    hero: heroRef,
    models: modelsRef,
    comparison: comparisonRef,
    booking: bookingRef,
    pricing: pricingRef,
    contact: contactRef
  };

  const scrollToSection = (sectionName: keyof typeof sectionRefs) => {
    sectionRefs[sectionName]?.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="app">
      {/* Noise Overlay */}
      <div className="noise"></div>
      
      {/* Custom Cursor */}
      <div ref={cursorDotRef} className="cursor-dot"></div>

      <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="container flex justify-between items-center">
          <a href="#" className="nav-logo" onClick={(e) => { e.preventDefault(); scrollToSection('hero'); }}>
            AeroMotors
          </a>
          <div className="nav-links">
            <button onClick={() => scrollToSection('models')}>Fleet</button>
            <button onClick={() => scrollToSection('comparison')}>Specs</button>
            <button onClick={() => scrollToSection('pricing')}>Pricing</button>
            <button onClick={() => scrollToSection('booking')}>Reserve</button>
          </div>
        </div>
      </nav>

      <section ref={heroRef} className="hero" id="hero">
        <video 
          className="hero-video" 
          autoPlay 
          muted 
          loop 
          playsInline
          poster="https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&q=80&w=2000"
        >
        </video>
        <div className="container" style={{ position: 'relative', zIndex: 10, paddingBottom: '10vh' }}>
          <span className="overline reveal" ref={addToRefs}>Generation 01</span>
          <h1 className="title-massive reveal" ref={addToRefs} style={{ transitionDelay: '0.1s' }}>Drive<br/>Beyond.</h1>
          <div className="flex flex-responsive justify-between items-end reveal" ref={addToRefs} style={{ marginTop: '2rem', transitionDelay: '0.2s' }}>
            <p className="text-muted" style={{ maxWidth: '400px', fontSize: '1.25rem' }}>
              Precision engineering meets uncompromising electric performance.
            </p>
            <button onClick={() => scrollToSection('models')} className="btn btn-primary" style={{ border: 'none', cursor: 'none' }}>
              Discover The Fleet
            </button>
          </div>
        </div>
      </section>

      <section ref={modelsRef} className="section" id="models" style={{ padding: 0 }}>
        <div className="container" style={{ padding: '8rem 3rem' }}>
          <span className="overline reveal" ref={addToRefs}>Catalog</span>
          <h2 className="reveal" ref={addToRefs}>The Fleet</h2>
        </div>
        
        <div className="models-grid">
          {filteredModels.length === 0 ? (
            <div style={{ padding: '4rem', gridColumn: 'span 2' }}>
              <p className="text-muted">No configurations found.</p>
            </div>
          ) : (
            filteredModels.map((car, index) => (
              <div 
                key={car.id} 
                className={`model-card reveal ${highlightedModelId === car.id ? 'highlight-pulse' : ''}`}
                ref={addToRefs}
                style={{ transitionDelay: `${index * 0.1}s` }}
              >
                {car.isFlagship && (
                  <span className="overline" style={{ position: 'absolute', top: '2.5rem', right: '3rem', zIndex: 10, color: 'var(--color-accent)' }}>
                    [ Flagship Edition ]
                  </span>
                )}
                <div className="car-image-wrapper">
                  <img src={car.image} alt={car.name} loading="lazy" />
                  <div className="model-info">
                    <div>
                      <span className="overline">{car.type}</span>
                      <h3 style={{ fontSize: '3rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 1 }}>{car.name}</h3>
                    </div>
                    <span style={{ fontSize: '2rem', fontWeight: 700, color: '#fff' }}>
                      {formatCurrency(car.price, currency)}
                    </span>
                  </div>
                </div>
                
                <div style={{ padding: '3rem' }}>
                  <p className="text-muted" style={{ marginBottom: '3rem', maxWidth: '600px', fontSize: '1.25rem' }}>{car.description}</p>
                  
                  <div className="flex-responsive flex gap-xl" style={{ borderTop: '1px solid var(--color-border)', paddingTop: '2rem' }}>
                    <div>
                      <span className="overline">Range</span>
                      <span style={{ fontSize: '2rem', fontWeight: 300, color: '#fff' }}>{car.range} <span style={{fontSize:'1rem', color:'var(--color-text-secondary)'}}>km</span></span>
                    </div>
                    <div>
                      <span className="overline">0-100 km/h</span>
                      <span style={{ fontSize: '2rem', fontWeight: 300, color: '#fff' }}>{car.acceleration} <span style={{fontSize:'1rem', color:'var(--color-text-secondary)'}}>s</span></span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section ref={comparisonRef} className="section" id="comparison">
        <div className="container">
          <span className="overline reveal" ref={addToRefs}>Analysis</span>
          <h2 className="reveal" ref={addToRefs}>Specifications</h2>
          <div className="reveal" ref={addToRefs} style={{ overflowX: 'auto', marginTop: '6rem' }}>
            <table className="comparison-table">
              <thead>
                <tr>
                  <th style={{ width: '25%' }}>Metrics</th>
                  {comparisonModels.map(car => (
                    <th key={car.id} style={{ fontSize: '2rem', color: '#fff', fontWeight: 700 }}>
                      {car.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Architecture</td>
                  {comparisonModels.map(car => <td key={car.id}>{car.type}</td>)}
                </tr>
                <tr>
                  <td>Est. Range</td>
                  {comparisonModels.map(car => <td key={car.id}>{car.range} km</td>)}
                </tr>
                <tr>
                  <td>Acceleration</td>
                  {comparisonModels.map(car => <td key={car.id}>{car.acceleration} sec</td>)}
                </tr>
                <tr>
                  <td>Capacity</td>
                  {comparisonModels.map(car => <td key={car.id}>{car.seating}</td>)}
                </tr>
                <tr>
                  <td>Base MSRP</td>
                  {comparisonModels.map(car => <td key={car.id} style={{ color: 'var(--color-text-primary)' }}>{formatCurrency(car.price, currency)}</td>)}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section ref={pricingRef} className="section" id="pricing" style={{ background: '#050505', padding: '8rem 0' }}>
        <div className="container">
          <div className="flex justify-between items-end mb-xl reveal" ref={addToRefs}>
            <div>
              <span className="overline">Investment</span>
              <h2>Pricing</h2>
            </div>
            <div className="flex gap-sm" style={{ padding: '0.5rem', background: '#111', borderRadius: '100px' }}>
              <button 
                onClick={() => setCurrency('INR')} 
                style={{ padding: '0.5rem 1.5rem', borderRadius: '100px', border: 'none', cursor: 'pointer', background: currency === 'INR' ? 'var(--color-text-primary)' : 'transparent', color: currency === 'INR' ? '#000' : '#fff' }}
              >
                INR
              </button>
              <button 
                onClick={() => setCurrency('USD')} 
                style={{ padding: '0.5rem 1.5rem', borderRadius: '100px', border: 'none', cursor: 'pointer', background: currency === 'USD' ? 'var(--color-text-primary)' : 'transparent', color: currency === 'USD' ? '#000' : '#fff' }}
              >
                USD
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-2" style={{ marginTop: '4rem', gap: '2rem' }}>
            {cars.map(car => (
               <div key={`price-${car.id}`} className="reveal" ref={addToRefs} style={{ padding: '2rem', border: '1px solid var(--color-border)', borderRadius: '16px' }}>
                 <h3 style={{ fontSize: '1.5rem', color: '#fff', marginBottom: '0.5rem' }}>{car.name}</h3>
                 <p className="text-muted" style={{ marginBottom: '2rem' }}>{car.type}</p>
                 <p style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--color-accent)' }}>{formatCurrency(car.price, currency)}</p>
               </div>
            ))}
          </div>
        </div>
      </section>

      <section ref={bookingRef} className="section" id="booking" style={{ borderBottom: 'none', padding: '12rem 0' }}>
        <div className="container">
          <div className="grid grid-cols-2">
            <div className="reveal" ref={addToRefs}>
              <span className="overline">Experience</span>
              <h2 style={{ fontSize: 'clamp(4rem, 8vw, 8rem)', lineHeight: 0.9 }}>Reserve<br/>A Drive.</h2>
              <p className="text-muted" style={{ maxWidth: '400px', marginTop: '2rem' }}>
                Schedule a bespoke test drive experience at an AeroMotors gallery near you.
              </p>
            </div>
            
            <div className="reveal" ref={addToRefs} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <form onSubmit={(e) => { e.preventDefault(); alert('Reservation Confirmed.'); }}>
                <div className="flex flex-col gap-lg">
                  <select 
                    className="input-field" 
                    value={bookingData.model} 
                    onChange={(e) => setBookingData({...bookingData, model: e.target.value})}
                    required
                    style={{ background: 'transparent' }}
                  >
                    <option value="" disabled style={{ color: '#000' }}>Select Vehicle</option>
                    {cars.map(car => <option key={car.id} value={car.name} style={{ color: '#000' }}>{car.name}</option>)}
                  </select>
                  
                  <input 
                    type="date" 
                    className="input-field" 
                    value={bookingData.date}
                    onClick={(e) => { try { (e.target as any).showPicker(); } catch(err){} }}
                    onChange={(e) => setBookingData({...bookingData, date: e.target.value})}
                    required
                  />
                  
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="City / Region" 
                    value={bookingData.city}
                    onChange={(e) => setBookingData({...bookingData, city: e.target.value})}
                    required
                  />
                </div>
                
                <button type="submit" className="btn btn-primary" style={{ marginTop: '4rem', width: '100%', border: 'none' }}>
                  Submit Request
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      <footer ref={contactRef} style={{ padding: '8rem 0 4rem 0', background: '#020202', borderTop: '1px solid #111' }} id="contact">
        <div className="container flex flex-responsive justify-between items-end">
          <div>
            <h2 style={{ fontSize: '4rem', marginBottom: '1rem', letterSpacing: '-0.05em' }}>AeroMotors</h2>
            <p className="text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: '0.8rem' }}>Los Angeles · London · Tokyo</p>
          </div>
          <div className="text-right">
            <p className="text-muted" style={{ fontSize: '0.85rem' }}>© 2026 AeroMotors Inc.</p>
          </div>
        </div>
      </footer>

      <AIWidget 
        scrollToSection={scrollToSection}
        setFilteredModels={setFilteredModels}
        setComparisonModels={setComparisonModels}
        setCurrency={setCurrency}
        setHighlightedModelId={setHighlightedModelId}
        setBookingData={setBookingData}
        setThemeMode={setThemeMode}
        allCars={cars}
      />
    </div>
  );
}

export default App;
