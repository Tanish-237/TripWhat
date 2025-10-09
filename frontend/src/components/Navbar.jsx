import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";

export default function Navbar() {
  return (
    <header className="w-full border-b bg-background">
      <nav className="max-w-7xl mx-auto flex items-center justify-between px-6 md:px-10 py-4">
        {/* Logo / Brand Name */}
        <Link
          to="/"
          className="flex items-center gap-3 text-xl md:text-2xl font-bold text-black"
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-pink-500 shadow-md">
            <MapPin className="w-4 h-4 text-white" />
          </div>
          TripWhat
        </Link>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center gap-6">
          {/* <Link
            to="/plan"
            className="text-muted-foreground hover:text-foreground"
          >
            Plan
          </Link> */}
          {/* <Link
            to="/destinations"
            className="text-muted-foreground hover:text-foreground"
          >
            Destinations
          </Link>
          <Link
            to="#how-it-works"
            className="text-muted-foreground hover:text-foreground"
          >
            How it works
          </Link> */}
        </div>

        {/* Auth Buttons */}
        <div className="flex items-center gap-3">
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
        </div>
      </nav>
    </header>
  );
}
