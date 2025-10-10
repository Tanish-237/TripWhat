import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Save, LogOut, MapPin, Calendar, Plane, TrendingUp, Shield, Trash2, Clock, DollarSign, Compass, RefreshCw } from "lucide-react";
import Navbar from "@/components/Navbar";
import { apiUpdateProfile, apiGetTripStatistics, getToken } from "@/lib/api";
import { toast } from "react-toastify";

// Dynamic avatar URLs with travel-themed seeds
const generateAvatars = (userName = '') => {
  const travelSeeds = [
    'Traveler', 'Explorer', 'Wanderer', 'Adventurer', 
    'Nomad', 'Voyager', 'Globetrotter', 'Backpacker',
    'Tourist', 'Pilgrim', 'Journeyer', 'Roamer'
  ];
  
  // Use user's name as base seed if available, otherwise use travel themes
  const baseSeeds = userName ? [userName, `${userName}Travel`, `${userName}Adventure`] : [];
  const allSeeds = [...baseSeeds, ...travelSeeds].slice(0, 12);
  
  return allSeeds.map(seed => 
    `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`
  );
};

const ProfilePage = () => {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [avatars, setAvatars] = useState(generateAvatars());
  const [statistics, setStatistics] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    bio: '',
    avatarUrl: avatars[0],
    preferences: {
      notificationsEnabled: true,
      darkMode: false,
      budget: 'mid-range',
      travelStyle: 'cultural',
      interests: [],
    }
  });
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    // Generate avatars based on user's name and update state
    if (user?.name) {
      const userAvatars = generateAvatars(user.name);
      setAvatars(userAvatars);
      
      setProfileData(prev => ({
        ...prev,
        name: user.name || '',
        email: user.email || '',
        bio: user.bio || '',
        avatarUrl: user.avatarUrl || userAvatars[0],
        preferences: {
          notificationsEnabled: user.preferences?.notificationsEnabled ?? true,
          darkMode: user.preferences?.darkMode ?? false,
          budget: user.preferences?.budget || 'mid-range',
          travelStyle: user.preferences?.travelStyle || 'cultural',
          interests: user.preferences?.interests || [],
        }
      }));
    }
    
    // Fetch trip statistics
    fetchStatistics();
  }, [user]);
  
  const fetchStatistics = async () => {
    try {
      setLoadingStats(true);
      const token = getToken();
      if (!token) {
        console.log('No token found, skipping statistics fetch');
        return;
      }
      
      console.log('🔄 Fetching trip statistics...');
      const response = await apiGetTripStatistics(token);
      console.log('📥 Statistics response:', response);
      
      if (response && response.statistics) {
        setStatistics(response.statistics);
        console.log('✅ Statistics breakdown:', {
          totalTrips: response.statistics.totalTrips,
          savedTrips: response.statistics.savedTrips,
          upcomingTrips: response.statistics.upcomingTrips,
          completedTrips: response.statistics.completedTrips,
          totalDaysTraveled: response.statistics.totalDaysTraveled,
          citiesVisited: response.statistics.citiesVisited,
          countriesVisited: response.statistics.countriesVisited
        });
      } else {
        console.error('❌ Invalid statistics response:', response);
        toast.error('Invalid statistics data received');
      }
    } catch (error) {
      console.error('❌ Error fetching statistics:', error);
      toast.error('Failed to load trip statistics');
    } finally {
      setLoadingStats(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePreferenceChange = (name, value) => {
    setProfileData(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [name]: value
      }
    }));
  };

  const selectAvatar = (avatarUrl) => {
    setProfileData(prev => ({
      ...prev,
      avatarUrl
    }));
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });
    
    try {
      const token = getToken();
      if (!token) {
        toast.error('Please log in to update your profile');
        setSaving(false);
        return;
      }
      
      // Prepare complete profile data
      const profileUpdateData = {
        name: profileData.name?.trim() || '',
        bio: profileData.bio?.trim() || '',
        avatarUrl: profileData.avatarUrl || '',
        preferences: {
          budget: profileData.preferences?.budget || 'mid-range',
          travelStyle: profileData.preferences?.travelStyle || 'cultural',
          interests: profileData.preferences?.interests || [],
          notificationsEnabled: profileData.preferences?.notificationsEnabled ?? true,
          darkMode: profileData.preferences?.darkMode ?? false,
        }
      };
      
      console.log('Saving complete profile data:', profileUpdateData);
      
      const response = await apiUpdateProfile(profileUpdateData, token);
      
      console.log('Profile update response:', response);
      
      // Update user context with new data
      if (updateUser && response.user) {
        updateUser(response.user);
        console.log('User context updated with:', response.user);
      }
      
      toast.success('Profile updated successfully! 🎉');
      setMessage({ 
        type: 'success', 
        text: 'All changes saved successfully!' 
      });
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setMessage({ type: '', text: '' });
      }, 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      const errorMsg = error.message || 'Failed to update profile. Please try again.';
      toast.error(errorMsg);
      setMessage({ 
        type: 'error', 
        text: errorMsg
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    setLoading(true);
    logout();
    navigate('/');
  };

  if (!user && !loading) {
    navigate('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      <main className="container max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Your Profile</h1>

        {message.text && (
          <div className={`mb-6 p-4 rounded-md ${
            message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 
            'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        {/* Trip Statistics */}
        {loadingStats ? (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Travel Journey</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="bg-gray-50 animate-pulse">
                  <CardContent className="pt-6">
                    <div className="h-12 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : statistics ? (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Your Travel Journey</h2>
              <button
                onClick={fetchStatistics}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                title="Refresh statistics"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh</span>
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <Calendar className="w-8 h-8 text-green-600" />
                    <span className="text-3xl font-bold text-green-900">{statistics.totalDaysTraveled || 0}</span>
                  </div>
                  <p className="text-sm font-medium text-green-700">Days Traveled</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <MapPin className="w-8 h-8 text-purple-600" />
                    <span className="text-3xl font-bold text-purple-900">{statistics.citiesVisited || 0}</span>
                  </div>
                  <p className="text-sm font-medium text-purple-700">Cities Visited</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <TrendingUp className="w-8 h-8 text-orange-600" />
                    <span className="text-3xl font-bold text-orange-900">{statistics.countriesVisited || 0}</span>
                  </div>
                  <p className="text-sm font-medium text-orange-700">Countries</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                    <p className="text-sm font-semibold text-gray-700">Saved Trips</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{statistics.savedTrips || 0}</p>
                </CardContent>
              </Card>

              <Card className="bg-green-50 border-green-200">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-green-600"></div>
                    <p className="text-sm font-semibold text-gray-700">Upcoming Trips</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{statistics.upcomingTrips || 0}</p>
                </CardContent>
              </Card>

              <Card className="bg-purple-50 border-purple-200">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-purple-600"></div>
                    <p className="text-sm font-semibold text-gray-700">Completed Trips</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{statistics.completedTrips || 0}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left Column - Avatar */}
          <div className="md:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Profile Picture</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-md mb-6">
                  <img
                    src={profileData.avatarUrl}
                    alt="Profile Avatar"
                    className="w-full h-full object-cover"
                  />
                </div>
                
                <h3 className="text-lg font-medium mb-4">Select an Avatar</h3>
                <div className="grid grid-cols-4 gap-3">
                  {avatars.map((avatar, index) => (
                    <div 
                      key={index}
                      className={`w-14 h-14 rounded-full overflow-hidden cursor-pointer border-2 hover:scale-105 transition-transform ${
                        profileData.avatarUrl === avatar ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-200'
                      }`}
                      onClick={() => selectAvatar(avatar)}
                    >
                      <img 
                        src={avatar} 
                        alt={`Avatar option ${index + 1}`}
                        className="w-full h-full object-cover" 
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Profile Details */}
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <Input
                    type="text"
                    name="name"
                    value={profileData.name || ''}
                    onChange={handleChange}
                    placeholder="Your name"
                    className="text-gray-900 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <Input
                    type="email"
                    name="email"
                    value={profileData.email || ''}
                    onChange={handleChange}
                    placeholder="your.email@example.com"
                    disabled
                    className="text-gray-700"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Email cannot be changed
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Bio
                    </label>
                    <span className="text-xs text-gray-500">
                      {profileData.bio?.length || 0}/500
                    </span>
                  </div>
                  <Textarea
                    name="bio"
                    value={profileData.bio || ''}
                    onChange={handleChange}
                    placeholder="Tell us something about yourself and your travel preferences..."
                    className="resize-none text-gray-900"
                    rows={4}
                    maxLength={500}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Share your travel stories, favorite destinations, or dream trips!
                  </p>
                </div>

                <div className="pt-4">
                  <Button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 h-11"
                  >
                    {saving ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Save className="w-5 h-5" />
                    )}
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Travel Preferences */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Compass className="w-5 h-5 text-blue-600" />
                  Travel Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Budget Preference
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['budget', 'mid-range', 'luxury'].map((level) => (
                      <button
                        key={level}
                        onClick={() => handlePreferenceChange('budget', level)}
                        className={`px-4 py-2 rounded-lg border-2 transition-all capitalize ${
                          profileData.preferences.budget === level
                            ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                        }`}
                      >
                        {level === 'mid-range' ? 'Mid-Range' : level}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Travel Style
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {['adventure', 'relaxation', 'cultural', 'business'].map((style) => (
                      <button
                        key={style}
                        onClick={() => handlePreferenceChange('travelStyle', style)}
                        className={`px-4 py-2 rounded-lg border-2 transition-all capitalize ${
                          profileData.preferences.travelStyle === style
                            ? 'border-green-500 bg-green-50 text-green-700 font-semibold'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                        }`}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Interests
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['museums', 'nightlife', 'nature', 'food', 'shopping', 'history', 'art'].map((interest) => (
                      <button
                        key={interest}
                        onClick={() => {
                          const interests = profileData.preferences.interests || [];
                          const newInterests = interests.includes(interest)
                            ? interests.filter(i => i !== interest)
                            : [...interests, interest];
                          handlePreferenceChange('interests', newInterests);
                        }}
                        className={`px-3 py-1.5 rounded-full text-sm transition-all capitalize ${
                          (profileData.preferences.interests || []).includes(interest)
                            ? 'bg-purple-500 text-white font-medium'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {interest}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* App Preferences */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-600" />
                  App Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Enable Notifications
                    </label>
                    <p className="text-xs text-gray-500">Get updates about your trips</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={profileData.preferences.notificationsEnabled}
                      onChange={() => handlePreferenceChange(
                        'notificationsEnabled', 
                        !profileData.preferences.notificationsEnabled
                      )}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Dark Mode
                    </label>
                    <p className="text-xs text-gray-500">Coming soon!</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer opacity-50">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={profileData.preferences.darkMode}
                      disabled
                    />
                    <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                  </label>
                </div>
                
                {user?.createdAt && (
                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                      <Clock className="w-4 h-4" />
                      <span>Member since {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                    </div>
                    <Button
                      variant="outline"
                      onClick={handleLogout}
                      className="w-full flex items-center justify-center gap-2 border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="mt-6 border-red-200">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2 text-red-600">
                  <Trash2 className="w-5 h-5" />
                  Danger Zone
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!showDeleteConfirm ? (
                  <div>
                    <p className="text-sm text-gray-600 mb-3">
                      Permanently delete your account and all associated data. This action cannot be undone.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="border-red-300 text-red-700 hover:bg-red-50"
                    >
                      Delete Account
                    </Button>
                  </div>
                ) : (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm font-semibold text-red-800 mb-3">
                      Are you absolutely sure? This will:
                    </p>
                    <ul className="text-sm text-red-700 mb-4 list-disc list-inside space-y-1">
                      <li>Delete all your trip data</li>
                      <li>Remove your profile permanently</li>
                      <li>Cancel all upcoming trips</li>
                    </ul>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowDeleteConfirm(false)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => {
                          toast.info('Account deletion is disabled in demo');
                          setShowDeleteConfirm(false);
                        }}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                      >
                        Yes, Delete My Account
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProfilePage;