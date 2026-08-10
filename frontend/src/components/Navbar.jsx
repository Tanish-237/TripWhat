import { Link, useNavigate, useLocation } from "react-router-dom";
import { MapPin, User, LogOut, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect, useRef } from "react";

export default function Navbar({ showSearch = false }) {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="w-full bg-[var(--surface)] sticky top-0 z-50" style={{ boxShadow: "0 4px 20px -2px rgba(0,0,0,0.05)" }}>
      <nav className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link
          to={isAuthenticated ? "/trips" : "/"}
          className="flex items-center gap-2 text-lg font-bold text-[var(--ink)]"
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--peach)]">
            <MapPin className="w-4 h-4 text-white" />
          </div>
          TripWhat
        </Link>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <Link
                to="/new"
                className="flex items-center gap-1.5 px-4 py-2 rounded-[1.25rem] bg-[var(--peach)] text-white text-sm font-medium hover:opacity-90 transition-opacity duration-300"
              >
                <Plus className="w-4 h-4" />
                New trip
              </Link>
              <Link
                to="/trips"
                className="text-sm font-medium text-[var(--muted)] hover:text-[var(--ink)] transition-colors duration-300"
              >
                Trips
              </Link>

              <div className="relative ml-2" ref={profileMenuRef}>
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-2 focus:outline-none group"
                >
                  <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-[rgba(41,37,36,0.06)] group-hover:border-[var(--peach)] transition-colors duration-300">
                    <img
                      src={user?.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user?.name || 'User'}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`}
                      alt={user?.name || 'User'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </button>

                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-[var(--surface)] rounded-[1.25rem] py-2 z-50" style={{ boxShadow: "0 8px 30px -4px rgba(0,0,0,0.08)" }}>
                    <div className="px-4 py-3 border-b border-[rgba(41,37,36,0.06)]">
                      <p className="text-sm font-semibold text-[var(--ink)] truncate">{user?.name}</p>
                      <p className="text-xs text-[var(--muted)] truncate">{user?.email}</p>
                    </div>
                    <div className="py-1">
                      <Link
                        to="/profile"
                        onClick={() => setShowProfileMenu(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--ink)] hover:bg-[var(--sage)] transition-colors duration-300"
                      >
                        <User className="w-4 h-4" />
                        My profile
                      </Link>
                    </div>
                    <div className="border-t border-[rgba(41,37,36,0.06)] pt-1">
                      <button
                        onClick={() => { setShowProfileMenu(false); handleLogout(); }}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors w-full"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm font-medium text-[var(--ink)] hover:text-[var(--peach)] transition-colors duration-300"
              >
                Log in
              </Link>
              <Link
                to="/signup"
                className="px-5 py-2 rounded-[1.25rem] bg-[var(--peach)] text-white text-sm font-medium hover:opacity-90 transition-opacity duration-300"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
