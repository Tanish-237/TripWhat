import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, MapPin, Plane, Calendar, Compass, LocateIcon } from "lucide-react";
import Navbar from "@/components/Navbar";
import { apiSearchPlaces } from "@/lib/api";

export default function SearchPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Parse the search query from URL
  const searchQuery = new URLSearchParams(location.search).get("q");

  useEffect(() => {
    if (!searchQuery) {
      navigate("/plan");
      return;
    }

    // Fetch search results
    const fetchSearchResults = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log('SearchPage: Fetching results for query:', searchQuery); // Debug log
        const data = await apiSearchPlaces(searchQuery, 20); // Get more results for search page
        console.log('SearchPage: API response:', data); // Debug log
        
        // Transform the API response to our format if needed
        const formattedResults = data.map(place => ({
          id: place.xid || place.id,
          name: place.name,
          location: place.location || place.address?.city || place.address?.county || place.address?.country,
          country: place.country,
          description: place.description || place.kinds?.replace(/,/g, ', ') || 'Tourist attraction',
          imageUrl: place.imageUrl || place.preview?.source || 
            `https://source.unsplash.com/featured/?${encodeURIComponent((place.name || 'travel') + ' ' + (place.country || ''))}`,
          type: place.type || 
                (place.kinds?.includes('museums') ? 'museum' : 
                place.kinds?.includes('historic') ? 'historic' :
                place.kinds?.includes('cultural') ? 'cultural' :
                place.kinds?.includes('natural') ? 'natural' : 'attraction'),
          coordinates: place.coordinates || {
            lat: place.point?.lat || place.geometry?.coordinates?.[1],
            lon: place.point?.lon || place.geometry?.coordinates?.[0]
          }
        }));
        
        setSearchResults(formattedResults);
        setLoading(false);
        console.log('SearchPage: Successfully loaded', formattedResults.length, 'results'); // Debug log
      } catch (err) {
        console.error("SearchPage: Error fetching search results:", err);
        setError(`Failed to fetch search results: ${err.message}. Please try again.`);
        setLoading(false);
      }
    };

    fetchSearchResults();
  }, [searchQuery, navigate]);

  const handleItemClick = (item) => {
    // In a real app, this would navigate to a detail page for the selected item
    console.log("Selected item:", item);
    // navigate(`/place/${item.id}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200">
      <Navbar />
      
      <main className="container max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800">
            Search Results for "{searchQuery}"
          </h1>
          <p className="text-slate-600 mt-2">
            Showing {searchResults.length} results
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-700">
            {error}
          </div>
        ) : searchResults.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
              <MapPin className="w-8 h-8 text-slate-400" />
            </div>
            <h2 className="text-2xl font-semibold text-slate-700 mb-2">
              No results found
            </h2>
            <p className="text-slate-500 max-w-md mx-auto mb-6">
              We couldn't find any matches for "{searchQuery}". Try different keywords or browse popular destinations.
            </p>
            <Button onClick={() => navigate("/plan")}>
              Go to Trip Planner
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {searchResults.map((item) => (
              <Card 
                key={item.id}
                className="overflow-hidden transition-all duration-200 hover:shadow-lg cursor-pointer"
                onClick={() => handleItemClick(item)}
              >
                <div className="h-48 overflow-hidden">
                  <img 
                    src={item.imageUrl} 
                    alt={item.name}
                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                  />
                </div>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl font-bold">{item.name}</CardTitle>
                    <div className="px-2 py-1 text-xs rounded flex items-center">
                      {item.type === 'museum' ? (
                        <>
                          <Calendar className="w-3 h-3 mr-1 text-purple-600" />
                          <span className="text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">Museum</span>
                        </>
                      ) : item.type === 'historic' ? (
                        <>
                          <Calendar className="w-3 h-3 mr-1 text-amber-600" />
                          <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">Historic</span>
                        </>
                      ) : item.type === 'natural' ? (
                        <>
                          <Compass className="w-3 h-3 mr-1 text-green-600" />
                          <span className="text-green-700 bg-green-50 px-1.5 py-0.5 rounded">Nature</span>
                        </>
                      ) : item.type === 'city' ? (
                        <>
                          <MapPin className="w-3 h-3 mr-1 text-blue-600" />
                          <span className="text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">City</span>
                        </>
                      ) : (
                        <>
                          <MapPin className="w-3 h-3 mr-1 text-blue-600" />
                          <span className="text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">Attraction</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center text-slate-500 text-sm">
                    <MapPin className="w-3 h-3 mr-1" />
                    <span className="font-medium">{item.location}</span>
                    {item.country && item.location !== item.country && (
                      <span className="ml-1 text-slate-400">, {item.country}</span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600 text-sm line-clamp-3">
                    {item.description}
                  </p>
                  <div className="mt-4 flex justify-end">
                    <Button size="sm" variant="outline" className="text-xs">
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}