import React from 'react';
import './footer.css'; 
import logo from '../../images/brunelLogoTwo.png';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        <p>&copy; 2024 Brunel University London. All rights reserved.</p>
        <nav className="footer-nav">
          <a href="/privacy">Privacy Policy</a>
          <a href="/terms">Terms of Use</a>
          <a href="/accessibility">Accessibility</a>
        </nav>
      </div>
    </footer>
  );
};

export default Footer;
