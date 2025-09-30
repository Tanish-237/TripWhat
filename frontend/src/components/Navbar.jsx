import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  return (
    <header className="w-full border-b bg-background">
      <nav className="max-w-7xl mx-auto flex items-center justify-between px-6 md:px-10 py-4">
        {/* Logo / Brand Name */}
        <Link to="/" className="text-xl md:text-2xl font-bold">
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
            <Link to="/login">Login</Link>
          </Button>
          <Button asChild>
            <Link to="/signup">Sign Up</Link>
          </Button>
        </div>
      </nav>
    </header>
  );
}
