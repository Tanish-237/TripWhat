import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Save, LogOut } from "lucide-react";
import Navbar from "@/components/Navbar";

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
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [avatars, setAvatars] = useState(generateAvatars());
  
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    bio: '',
    avatarUrl: avatars[0],
    preferences: {
      notificationsEnabled: true,
      darkMode: false,
      language: 'english',
    }
  });

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
      }));
    }
  }, [user]);

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
      // In a real app, you would make an API call to update the profile
      // For now we'll simulate a successful update
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setMessage({ 
        type: 'success', 
        text: 'Profile updated successfully!' 
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ 
        type: 'error', 
        text: 'Failed to update profile. Please try again.' 
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
                    value={profileData.name}
                    onChange={handleChange}
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <Input
                    type="email"
                    name="email"
                    value={profileData.email}
                    onChange={handleChange}
                    placeholder="your.email@example.com"
                    disabled
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Email cannot be changed
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bio
                  </label>
                  <Textarea
                    name="bio"
                    value={profileData.bio}
                    onChange={handleChange}
                    placeholder="Tell us something about yourself and your travel preferences..."
                    className="resize-none"
                    rows={4}
                  />
                </div>

                <div className="pt-4 flex flex-col sm:flex-row justify-between gap-3">
                  <Button
                    variant="outline"
                    className="flex items-center gap-2"
                    onClick={handleLogout}
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </Button>
                  <Button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-xl">Preferences</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">
                      Enable notifications
                    </label>
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
                    <label className="text-sm font-medium text-gray-700">
                      Dark Mode
                    </label>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={profileData.preferences.darkMode}
                        onChange={() => handlePreferenceChange(
                          'darkMode', 
                          !profileData.preferences.darkMode
                        )}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Language
                    </label>
                    <select
                      className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                      value={profileData.preferences.language}
                      onChange={(e) => handlePreferenceChange('language', e.target.value)}
                    >
                      <option value="english">English</option>
                      <option value="spanish">Spanish</option>
                      <option value="french">French</option>
                      <option value="german">German</option>
                      <option value="japanese">Japanese</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProfilePage;