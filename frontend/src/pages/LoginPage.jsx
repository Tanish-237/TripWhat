import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Mail, Lock } from "lucide-react";
import Navbar from "@/components/Navbar";

export default function LoginPage() {
  const [formData, setFormData] = useState({
    emailOrUsername: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // Basic validation
      if (!formData.emailOrUsername || !formData.password) {
        throw new Error("All fields are required");
      }

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // For demo purposes, just redirect to plan page
      // In a real app, you'd validate credentials and store auth token
      console.log("Login attempt:", formData);
      navigate("/plan");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <div className="fixed top-0 left-0 w-full z-50 shadow-md bg-white">
        <Navbar />
      </div>

      {/* Main Content */}
      <div className="pt-24 flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md">
          {/* Compact Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Welcome Back
            </h1>
            <p className="text-gray-600 text-sm">
              Login to continue planning your perfect journey
            </p>
          </div>

          <Card className="bg-white border border-gray-200 shadow-lg">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-xl font-bold">Login</CardTitle>
              <CardDescription className="text-sm">
                Enter your credentials to access your account
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                {error && (
                  <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <label
                    htmlFor="emailOrUsername"
                    className="text-sm font-medium text-gray-700"
                  >
                    Email or Username
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="emailOrUsername"
                      name="emailOrUsername"
                      type="text"
                      placeholder="Enter your email or username"
                      value={formData.emailOrUsername}
                      onChange={handleChange}
                      required
                      disabled={isLoading}
                      className="pl-9 h-10 bg-white border-gray-200 text-gray-900 placeholder:text-gray-500 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="password"
                    className="text-sm font-medium text-gray-700"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      disabled={isLoading}
                      className="pl-9 h-10 bg-white border-gray-200 text-gray-900 placeholder:text-gray-500 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end">
                  {/* <Link
                  to="/forgot-password"
                  className="text-xs text-blue-600 hover:text-blue-500 font-medium"
                >
                  Forgot your password?
                </Link> */}
                </div>
              </CardContent>

              <CardFooter className="flex flex-col space-y-3 pt-2">
                <Button
                  type="submit"
                  className="w-full h-10 bg-gradient-to-r from-blue-500 to-pink-500 hover:from-blue-600 hover:to-pink-600 hover:shadow-lg text-white border-0 font-semibold transition-all duration-300"
                  disabled={isLoading}
                >
                  {isLoading ? "Logging in..." : "Login"}
                </Button>

                <div className="text-center text-xs text-gray-600">
                  Don't have an account?{" "}
                  <Link
                    to="/signup"
                    className="text-blue-600 hover:text-blue-500 font-medium"
                  >
                    Sign up
                  </Link>
                </div>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
