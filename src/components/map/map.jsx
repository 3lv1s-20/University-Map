import React, { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import "./map.css";

function Map() {

  
  // State variables
  const [mapLoaded, setMapLoaded] = useState(false); // Tracks whether the Google Maps API script has finished loading
  const [map, setMap] = useState(null); // Stores the Google Maps instance once it's created
  const [showIframe, setShowIframe] = useState(false); // Controls the visibility of the iframe window for indoor plans
  const [iframeUrl, setIframeUrl] = useState(""); // Stores the URL for the iframe content 
  const [backendLocations, setBackendLocations] = useState([]); // Stores the list of locations fetched from the backend
  const [autocompleteInitialized, setAutocompleteInitialized] = useState(false);  // Tracks whether the autocomplete functionality has been set up

  // Refs for storing map-related objects
  const mapRef = useRef(null); // Maintains a reference to the Google Maps instance across re-renders
  const directionsServiceRef = useRef(null); // Stores the Google Maps DirectionsService instance for calculating routes
  const directionsRendererRef = useRef(null);  // Stores the Google Maps DirectionsRenderer instance for displaying routes on the map
  const calculateRouteRef = useRef(null); // Stores the function for calculating routes, allowing it to be called from event listeners

  let userMarker = null;

   // Load Google Maps API script
  useEffect(() => {
    const googleMapScript = document.createElement("script");
    googleMapScript.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyC9T6jfsnZra1FS3Ud__bLN6bGtUUJ8kH4&libraries=places,geometry`; //api key is currently restricted so won't work 
    googleMapScript.async = true;
    googleMapScript.defer = true;
    
    googleMapScript.onload = () => {
      setMapLoaded(true);
    };

    document.body.appendChild(googleMapScript);

    return () => {
      document.body.removeChild(googleMapScript);
    };
  }, []);

  // Helper function to get coordinates from input
  const getCoordinatesFromInput = useCallback((input) => {
    const location = backendLocations.find(item => item.address === input);
    if (location) {
      return new window.google.maps.LatLng(location.coordinates.lat, location.coordinates.lng);
    }
    return input;
  }, [backendLocations]);

  // Initialize the map and related services
  const initializeMap = useCallback(() => {
    const mapInstance = new window.google.maps.Map(document.getElementById("map"), {
      center: { lat: 51.5321, lng: -0.4726 },
      zoom: 15,
    });

    // Set map boundaries    
    const universityBounds = new window.google.maps.LatLngBounds(
      new window.google.maps.LatLng(51.5303, -0.4812),
      new window.google.maps.LatLng(51.5347, -0.4663)
    );

    mapInstance.setOptions({
      restriction: { latLngBounds: universityBounds, strictBounds: true },
    });

    mapRef.current = mapInstance;
    setMap(mapInstance);

    // Initialize directions service and renderer
    directionsServiceRef.current = new window.google.maps.DirectionsService();
    directionsRendererRef.current = new window.google.maps.DirectionsRenderer();
    directionsRendererRef.current.setMap(mapInstance);

    // Set up route calculation function
    calculateRouteRef.current = () => {
      if (!directionsServiceRef.current) {
        console.error("Directions service is not initialized.");
        return;
      }
  
      const originInput = document.getElementById("origin").value;
      const destinationInput = document.getElementById("destination").value;
      const mode = window.google.maps.TravelMode.WALKING;
  
      if (!originInput || !destinationInput) {
        console.error("Please provide both origin and destination.");
        return;
      }
  
      const originCoords = getCoordinatesFromInput(originInput);
      const destCoords = getCoordinatesFromInput(destinationInput);
  
      if (!originCoords || !destCoords) {
        console.error("Invalid origin or destination coordinates.");
        return;
      }
  
      const request = {
        origin: originCoords,
        destination: destCoords,
        travelMode: mode,
      };
  
      directionsServiceRef.current.route(request, (result, status) => {
        if (status === "OK") {
          directionsRendererRef.current.setDirections(result);
        } else {
          console.error("Directions request failed due to " + status);
        }
      });
    };
  
    getUserLocation(mapInstance);
    setupMapUI(mapInstance);
    setupClickableAreas(mapInstance);
  }, [getCoordinatesFromInput]);

  // Initialize map when Google Maps API is loaded
  useEffect(() => {
    if (mapLoaded) {
      initializeMap();
    }
  }, [mapLoaded, initializeMap]);

  // Function to clear the current route
  const clearRoute = useCallback(() => {
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setDirections({ routes: [] });
    }
    
    const destinationInput = document.getElementById("destination");
    if (destinationInput) {
      destinationInput.value = "";
    }
  }, []);

   // Get and display user's current location
  const getUserLocation = useCallback((mapInstance) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };

          if (userMarker) userMarker.setMap(null);

          userMarker = new window.google.maps.Marker({
            position: userLocation,
            map: mapInstance,
            title: "Your Location",
            icon: {
              url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
            },
          });

          mapInstance.setCenter(userLocation);

          // Reverse geocode the user's location
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ location: userLocation }, (results, status) => {
            if (status === "OK") {
              if (results[0]) {
                const address = results[0].formatted_address;
                const originInput = document.getElementById("origin");
                if (originInput) {
                  originInput.value = address;
                }
              } else {
                console.log("No results found");
              }
            } else {
              console.log("Geocoder failed due to: " + status);
            }
          });
        },
        () => {
          console.error("Error: The Geolocation service failed.");
        }
      );
    } else {
      console.error("Error: Your browser doesn't support geolocation.");
    }
  }, []);

  // Set up custom UI elements on the map
  const setupMapUI = useCallback((mapInstance) => {
    const uiContainer = document.createElement("div");
    uiContainer.className = "map-ui-container";

    const originInputContainer = createInputContainer("origin", "Origin");
    const destinationInputContainer = createInputContainer("destination", "Destination");

    uiContainer.appendChild(originInputContainer);
    uiContainer.appendChild(destinationInputContainer);

    const calculateButton = createButton("Calculate Route", () => calculateRouteRef.current());
    const clearButton = createButton("Clear Route", clearRoute);

    uiContainer.appendChild(calculateButton);
    uiContainer.appendChild(clearButton);

    const mapDiv = mapInstance.getDiv();
    mapDiv.appendChild(uiContainer);

    const autocompleteService = new window.google.maps.places.AutocompleteService();
    setupAutocomplete(document.getElementById("origin"), autocompleteService, mapInstance);
    setupAutocomplete(document.getElementById("destination"), autocompleteService, mapInstance);
  }, [clearRoute]);

   // Helper function to create input containers
  const createInputContainer = (id, placeholder) => {
    const container = document.createElement("div");
    container.className = "input-container";

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = placeholder;
    input.id = id;
    input.className = "map-input";

    const suggestionsContainer = document.createElement("div");
    suggestionsContainer.id = `${id}-suggestions`;
    suggestionsContainer.className = "suggestions-container";

    container.appendChild(input);
    container.appendChild(suggestionsContainer);

    return container;
  };

  // Helper function to create buttons
  const createButton = (text, onClick) => {
    const button = document.createElement("button");
    button.textContent = text;
    button.className = "map-button";
    button.addEventListener("click", onClick);
    return button;
  };

  // Get place predictions from Google Places API
  const getPredictions = (inputValue, mapInstance, autocompleteService) => {
    return new Promise((resolve, reject) => {
      const universityBounds = new window.google.maps.LatLngBounds(
        new window.google.maps.LatLng(51.5303, -0.4812),
        new window.google.maps.LatLng(51.5347, -0.4663)
      );
  
      autocompleteService.getPlacePredictions(
        {
          input: inputValue,
          types: ["university", "school", "gym", "library", "city_hall"],
          locationRestriction: universityBounds,
        },
        (predictions, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
            resolve(predictions);
          } else {
            resolve([]); 
          }
        }
      );
    });
  };

  // Set up autocomplete for input fields
  const setupAutocomplete = useCallback((inputElement, autocompleteService, mapInstance) => {
    if (!inputElement || !backendLocations.length) return;

    const handleInput = async () => {
      const inputValue = inputElement.value.toLowerCase();
      const suggestionsElement = inputElement.nextElementSibling;
      suggestionsElement.innerHTML = "";

      if (inputValue.length > 0) {
        // Filter backend locations
        const filteredLocations = backendLocations.filter(item =>
          item.address.toLowerCase().includes(inputValue)
        );

        // Get Google Places predictions
        let predictions = [];
        try {
          predictions = await getPredictions(inputValue, mapInstance, autocompleteService);
        } catch (error) {
          console.error("Error fetching Google Places suggestions:", error);
        }

        // Combine suggestions, prioritizing backend locations
        const allSuggestions = [
          ...filteredLocations.map(location => ({
            ...location,
            isBackendLocation: true
          })),
          ...predictions.map(prediction => ({
            address: prediction.description,
            isBackendLocation: false
          }))
        ];

        // Sort suggestions: backend locations first, then alphabetically
        allSuggestions.sort((a, b) => {
          if (a.isBackendLocation && !b.isBackendLocation) return -1;
          if (!a.isBackendLocation && b.isBackendLocation) return 1;
          return a.address.localeCompare(b.address);
        });

        // Display suggestions
        allSuggestions.forEach(suggestion => {
          const suggestionElement = createSuggestionElement(suggestion.address, () => {
            inputElement.value = suggestion.address;
            suggestionsElement.innerHTML = "";
          });
          if (suggestion.isBackendLocation) {
            suggestionElement.classList.add('backend-location');
          }
          suggestionsElement.appendChild(suggestionElement);
        });
      }
    };

    inputElement.removeEventListener("input", handleInput);
    inputElement.addEventListener("input", handleInput);
  }, [backendLocations, getPredictions]);

// Helper function to create suggestion elements
  const createSuggestionElement = (text, onClick) => {
    const suggestionElement = document.createElement("div");
    suggestionElement.textContent = text;
    suggestionElement.className = "suggestion";
    suggestionElement.addEventListener("click", onClick);
    return suggestionElement;
  };

  // Set up clickable areas on the map for the 3D plans
  const setupClickableAreas = (mapInstance) => {
    const areaLinks = [
      {
        bounds: [
          { lat: 51.53267, lng: -0.47543 },
          { lat: 51.53267, lng: -0.47468 },
          { lat: 51.5326, lng: -0.47468 },
          { lat: 51.5326, lng: -0.47543 },
        ],
        url: "https://smplr.me/wDdMxBA",
      },
      {
        bounds: [
          { lat: 51.5328, lng: -0.47324 }, //Top left 51.53283715274448, -0.4731666736423224
          { lat: 51.5328, lng: -0.47249 }, //Top right
          { lat: 51.53273, lng: -0.47249 }, //Bottom right
          { lat: 51.53273, lng: -0.47324 }, //Bottom left 51.53280044548716, -0.47257658769637695
        ],
        url: "https://smplr.me/wDdMxBA",
      },
    ];

    areaLinks.forEach((area) => {
      const clickableArea = new window.google.maps.Polygon({
        paths: area.bounds,
        strokeColor: "#102746",
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: "#102746",
        fillOpacity: 0.5,
        clickable: true,
      });

      clickableArea.setMap(mapInstance);

      const bounds = new window.google.maps.LatLngBounds();
      area.bounds.forEach((point) => bounds.extend(new window.google.maps.LatLng(point.lat, point.lng)));
      const centroid = bounds.getCenter();

      new window.google.maps.Marker({
        position: centroid,
        map: mapInstance,
        label: {
          text: "Click to open indoor plan",
          color: "white",
          fontWeight: "bold",
          fontSize: "12px",
        },
        icon: {
          url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==",
          size: new window.google.maps.Size(1, 1),
        },
      });

      clickableArea.addListener("click", () => {
        openIframeWindow(area.url);
      });
    });
  };

  // Fetch locations from backend
  const fetchLocations = useCallback(async () => {
    try {
      const res = await axios.get("http://localhost:8800/classrooms_list");
      const formattedLocations = res.data.map(classroom => ({
        address: `Classroom ${classroom.classID}`,
        coordinates: { lat: parseFloat(classroom.lat), lng: parseFloat(classroom.lng) }
      }));
      setBackendLocations(formattedLocations);
    } catch (err) {
      console.error("Error fetching locations:", err);
    }
  }, []);

   // Fetch locations when component mounts
  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  // Setup autocomplete after map is loaded and locations are fetched
  useEffect(() => {
    if (mapLoaded && backendLocations.length > 0) {
      const autocompleteService = new window.google.maps.places.AutocompleteService();
      setupAutocomplete(document.getElementById("origin"), autocompleteService, mapRef.current);
      setupAutocomplete(document.getElementById("destination"), autocompleteService, mapRef.current);
      setAutocompleteInitialized(true);
    }
  }, [mapLoaded, backendLocations, setupAutocomplete]);

  // Function to open iframe window
  const openIframeWindow = (url) => {
    setIframeUrl(url);
    setShowIframe(true);
  };

   // Function to close iframe window
  const closeIframeWindow = () => {
    setShowIframe(false);
  };  
  
   // Render the component
  return (
    <div className="map-wrapper">
      {showIframe && (
        <div className="iframe-window">
          <button onClick={closeIframeWindow} className="close-btn">X</button>
          <iframe
            title="Custom iframe"
            src={iframeUrl}
            className="iframe"
            allowFullScreen=""
            webkitAllowFullScreen=""
            mozAllowFullScreen=""
          ></iframe>
        </div>
      )}
      <div id="map" className="map-container"></div>
    </div>  

    
  );  
}

export default Map;