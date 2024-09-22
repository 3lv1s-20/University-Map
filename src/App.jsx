import React from 'react';
import './App.css';
import NavBar from './components/navBar/navBar.jsx';
import Map from './components/map/map.jsx';
import Footer from './components/footer/footer.jsx';

function App() {
  return (
    <div className="app-container">
      <NavBar />
      <div className="map-wrapper">
        <Map />
      </div>
      <Footer />
    </div>
  );
}

export default App;