import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MapPin, User, Search, X, LogOut, Settings } from "lucide-react";
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
  const [searchError, setSearchError] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const searchRef = useRef(null);
  const profileMenuRef = useRef(null);
  const location = useLocation();
  const searchTimeout = useRef(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };
    
    // Use mousedown instead of click for better UX
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Fetch search suggestions with debounce
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Clear any existing timeout
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    // Set a new timeout for debouncing
    searchTimeout.current = setTimeout(async () => {
      try {
        setLoading(true);
        setSearchError(null);
        console.log('[SEARCH] Searching for:', searchQuery.trim());
        
        // Use autocomplete API for suggestions
        const results = await apiGetLocationSuggestions(searchQuery.trim(), 8);
        console.log('[SEARCH] Autocomplete results:', results);
        
        // Ensure results is an array
        const validResults = Array.isArray(results) ? results : [];
        
        // Only update suggestions and show them if we still have a valid query
        if (searchQuery.trim().length >= 2) {
          setSuggestions(validResults);
          setShowSuggestions(true); // Always show dropdown, even if empty
        }
      } catch (error) {
        console.error("[SEARCH] Error fetching search suggestions:", error);
        setSearchError(error.message || 'Search failed');
        setSuggestions([]);
        setShowSuggestions(true); // Show dropdown with error
      } finally {
        setLoading(false);
      }
    }, 300); // Increased to 300ms for better stability

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
    // Small delay to ensure the UI updates before navigating
    setTimeout(() => {
      navigate(`/search?q=${encodeURIComponent(suggestion.name)}`);
    }, 100);
  };
  
  const clearSearch = () => {
    setSearchQuery("");
    setSuggestions([]);
    setShowSuggestions(false);
    setSearchError(null);
  };

  const handleInputFocus = () => {
    if (searchQuery.trim().length >= 2 && suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    // Show suggestions immediately if we have cached results and valid query
    if (value.trim().length >= 2 && suggestions.length > 0) {
      setShowSuggestions(true);
    } else if (value.trim().length < 2) {
      setShowSuggestions(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };
  
  return (
    <header className="w-full border-b bg-white sticky top-0 z-50 shadow-sm">
      <nav className="w-full px-6 md:px-10 py-4 flex items-center justify-between">
        {/* Logo / Brand Name - Fixed to far left */}
        <Link
          to={isAuthenticated ? "/plan" : "/"}
          className="flex items-center gap-3 text-xl md:text-2xl font-bold text-black flex-shrink-0"
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-pink-500 shadow-md">
            <MapPin className="w-4 h-4 text-white" />
          </div>
          TripWhat
        </Link>

        {/* Center section with search bar when needed */}
        <div className="flex-1 flex justify-center">
          {isAuthenticated && showSearch && (
            <div className="w-full max-w-xl">
              <div className="relative" ref={searchRef}>
                <form onSubmit={handleSearch} className="relative">
                  <Input
                    type="text"
                    placeholder="Search cities, destinations, attractions..."
                    value={searchQuery}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
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
                  error={searchError}
                />
              </div>
            </div>
          )}
        </div>

        {/* Navigation Links - Fixed to far right */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {isAuthenticated ? (
            <>
              <Button 
                variant="ghost"
                asChild
                className="text-gray-600 hover:text-blue-600 transition-colors"
              >
                <Link to="/saved-trips">Saved</Link>
              </Button>
              <Button
                variant="ghost"
                asChild
                className="text-gray-600 hover:text-pink-600 transition-colors"
              >
                <Link to="/upcoming-trips">Upcoming</Link>
              </Button>
              <Button
                variant="ghost"
                asChild
                className="text-gray-600 hover:text-green-600 transition-colors"
              >
                <Link to="/completed-trips">Completed</Link>
              </Button>
              
              {/* Profile Avatar Dropdown */}
              <div className="relative ml-2" ref={profileMenuRef}>
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-2 focus:outline-none group"
                >
                  <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-gray-300 group-hover:border-blue-500 transition-all duration-200 ring-0 group-hover:ring-2 group-hover:ring-blue-200">
                    <img
                      src={user?.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user?.name || 'User'}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`}
                      alt={user?.name || 'User'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </button>

                {/* Dropdown Menu */}
                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* User Info */}
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
                      <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                    </div>

                    {/* Menu Items */}
                    <div className="py-1">
                      <Link
                        to="/profile"
                        onClick={() => setShowProfileMenu(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                      >
                        <User className="w-4 h-4" />
                        <span>My Profile</span>
                      </Link>
                      
                      <Link
                        to="/saved-trips"
                        onClick={() => setShowProfileMenu(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                      >
                        <Settings className="w-4 h-4" />
                        <span>Manage Trips</span>
                      </Link>
                    </div>

                    {/* Logout */}
                    <div className="border-t border-gray-100 pt-1">
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          handleLogout();
                        }}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors w-full"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
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
