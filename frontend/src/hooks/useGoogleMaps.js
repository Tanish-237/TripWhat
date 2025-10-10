import { useEffect, useState } from 'react';

/**
 * Hook to load Google Maps JavaScript API with Places library
 * @param {string} apiKey - Google Maps API key
 * @returns {boolean} isLoaded - Whether the Google Maps API is loaded
 */
export function useGoogleMaps(apiKey) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    console.log('🔍 [useGoogleMaps] Hook called with apiKey:', apiKey ? `${apiKey.substring(0, 20)}...` : 'MISSING');
    
    // Check if already loaded
    if (window.google && window.google.maps && window.google.maps.places) {
      console.log('✅ [useGoogleMaps] Google Maps already loaded!');
      setIsLoaded(true);
      return;
    }

    // Skip if no API key
    if (!apiKey) {
      console.error('❌ [useGoogleMaps] NO API KEY PROVIDED! Check your .env file for VITE_GOOGLE_MAPS_API_KEY');
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector(
      'script[src*="maps.googleapis.com/maps/api/js"]'
    );
    
    if (existingScript) {
      console.log('⏳ [useGoogleMaps] Script already exists, waiting for load...');
      existingScript.addEventListener('load', () => {
        console.log('✅ [useGoogleMaps] Existing script loaded!');
        setIsLoaded(true);
      });
      return;
    }

    // Create and load the script
    console.log('📦 [useGoogleMaps] Creating new script tag...');
    const script = document.createElement('script');
    const scriptSrc = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,marker,geometry`;
    script.src = scriptSrc;
    script.async = true;
    script.defer = true;
    
    console.log('🌐 [useGoogleMaps] Script URL:', scriptSrc.replace(apiKey, 'API_KEY_HIDDEN'));

    script.onload = () => {
      console.log('✅ [useGoogleMaps] Google Maps API loaded successfully!');
      console.log('🔍 [useGoogleMaps] window.google exists:', !!window.google);
      console.log('🔍 [useGoogleMaps] window.google.maps exists:', !!(window.google && window.google.maps));
      console.log('🔍 [useGoogleMaps] window.google.maps.places exists:', !!(window.google && window.google.maps && window.google.maps.places));
      setIsLoaded(true);
    };

    script.onerror = (error) => {
      console.error('❌ [useGoogleMaps] Failed to load Google Maps API!');
      console.error('❌ [useGoogleMaps] Error details:', error);
      console.error('❌ [useGoogleMaps] Check:');
      console.error('   1. API key is valid');
      console.error('   2. Places API is enabled in Google Cloud Console');
      console.error('   3. Billing is set up');
      console.error('   4. No CORS or network issues');
      setIsLoaded(false);
    };

    console.log('📍 [useGoogleMaps] Appending script to document.head...');
    document.head.appendChild(script);

    // Cleanup function
    return () => {
      // Note: We don't remove the script on unmount as it may be used by other components
    };
  }, [apiKey]);

  console.log('🎯 [useGoogleMaps] Returning isLoaded:', isLoaded);
  return isLoaded;
}
