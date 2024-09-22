import React from 'react';
import './navBar.css';
import logo from '../../images/brunelLogoTwo.png';

export default function NavBar (){
  return (
    <nav className="navbar">
      <div className="navbar-left">
        <img src={logo} alt="Brunel Logo" className="navbar-logo"/>
        <h1 className="navbar-title">Brunel Campus Map</h1>
      </div>
      <div className="navbar-items">
        <ul>
          <li><a href="/">Home</a></li>
          <li><a href="/about">About</a></li>
          <li><a href="/contact">Contact</a></li>
        </ul>
      </div>
    </nav>
  );
}
