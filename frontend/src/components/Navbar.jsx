import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MapPin, User, Search, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { apiSearchPlaces, apiGetLocationSuggestions } from "@/lib/api";
import { SearchSuggestions } from "@/components/SearchSuggestions";

export default function Navbar({ showSearch = false }) {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef(null);
  const location = useLocation();
  const searchTimeout = useRef(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Fetch search suggestions with debounce
  useEffect(() => {
    if (searchQuery.trim().length < 1) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Clear any existing timeout
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    // Set a new timeout for debouncing (reduced to 150ms for faster response)
    searchTimeout.current = setTimeout(async () => {
      try {
        setLoading(true);
        console.log('Searching for:', searchQuery.trim()); // Debug log
        // Use autocomplete API for suggestions (faster and more relevant for location search)
        const results = await apiGetLocationSuggestions(searchQuery.trim(), 8);
        console.log('Autocomplete results:', results); // Debug log
        setSuggestions(results);
        setShowSuggestions(true);
      } catch (error) {
        console.error("Error fetching search suggestions:", error);
        setSuggestions([]);
        // Optional: Show user-friendly error
        // setError("Failed to fetch suggestions");
      } finally {
        setLoading(false);
      }
    }, 150); // 150ms debounce delay for faster response

    // Cleanup on component unmount
    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [searchQuery]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setShowSuggestions(false);
    }
  };
  
  const handleSelectSuggestion = (suggestion) => {
    setSearchQuery(suggestion.name);
    setShowSuggestions(false);
  };
  
  const clearSearch = () => {
    setSearchQuery("");
    setSuggestions([]);
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };
  
  return (
    <header className="w-full border-b bg-background sticky top-0 z-50 shadow-sm">
      <nav className="max-w-7xl mx-auto flex items-center justify-between px-6 md:px-10 py-4">
        {/* Logo / Brand Name */}
        <Link
          to={isAuthenticated ? "/plan" : "/"}
          className="flex items-center gap-3 text-xl md:text-2xl font-bold text-black"
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-pink-500 shadow-md">
            <MapPin className="w-4 h-4 text-white" />
          </div>
          TripWhat
        </Link>

        {/* Search Bar - Only show if showSearch prop is true (for TripPlannerPage) */}
        {isAuthenticated && showSearch && (
          <div className="flex-1 max-w-xl mx-8">
            <div className="relative" ref={searchRef}>
              <form onSubmit={handleSearch} className="relative">
                <Input
                  type="text"
                  placeholder="Search cities, destinations, attractions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchQuery.trim().length >= 2 && setShowSuggestions(true)}
                  className="w-full h-10 pl-10 pr-10 text-base bg-white border-gray-200 focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-200 rounded-full text-gray-900"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-blue-500" />
                </div>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                  </button>
                )}
              </form>
              
              <SearchSuggestions
                suggestions={suggestions}
                loading={loading}
                onSelectSuggestion={handleSelectSuggestion}
                visible={showSuggestions}
              />
            </div>
          </div>
        )}

        {/* Navigation Links */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <Button 
                variant="ghost"
                asChild
                className="text-gray-600 hover:text-blue-600 transition-colors"
              >
                <Link to="/saved-trips">Saved Trips</Link>
              </Button>
              <Button
                variant="ghost"
                asChild
                className="text-gray-600 hover:text-blue-600 transition-colors"
              >
                <Link to="/chat">Chat</Link>
              </Button>
              <Button
                variant="default"
                asChild
                className="ml-2 flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Link to="/profile">
                  <User className="w-4 h-4" />
                  <span className="ml-1">Profile</span>
                </Link>
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" asChild>
                <Link to="/login" className="text-black">
                  Login
                </Link>
              </Button>
              <Button asChild className="bg-black">
                <Link className="text-white" to="/signup">
                  Sign Up
                </Link>
              </Button>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
