import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { authApi, tripsApi } from "@/lib/api";
import Navbar from "@/components/Navbar";
import { toast } from "react-toastify";
import { User, Mail, Calendar, MapPin, Save, LogOut, Compass } from "lucide-react";

const ProfilePage = () => {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [statistics, setStatistics] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    bio: "",
    avatarUrl: "",
    preferences: {
      budget: "mid-range",
      travelStyle: "cultural",
      interests: [],
    },
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || "",
        email: user.email || "",
        bio: user.bio || "",
        avatarUrl: user.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.name || "User"}`,
        preferences: {
          budget: user.preferences?.budget || "mid-range",
          travelStyle: user.preferences?.travelStyle || "cultural",
          interests: user.preferences?.interests || [],
        },
      });
    }
    fetchStatistics();
  }, [user]);

  const fetchStatistics = async () => {
    try {
      setLoadingStats(true);
      const res = await tripsApi.statistics();
      if (res.data?.statistics) setStatistics(res.data.statistics);
    } catch (err) {
      console.error("Failed to load statistics:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const res = await authApi.updateProfile({
        name: profileData.name?.trim(),
        bio: profileData.bio?.trim(),
        avatarUrl: profileData.avatarUrl,
        preferences: profileData.preferences,
      });
      if (updateUser && res.data?.user) updateUser(res.data.user);
      toast.success("Profile updated successfully!");
    } catch (err) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  if (!user) {
    navigate("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Navbar />
      <main className="max-w-2xl mx-auto px-6 py-12 relative z-10">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full overflow-hidden border-2 border-[rgba(41,37,36,0.06)]">
            <img src={profileData.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--ink)] tracking-tight">My profile</h1>
        </div>

        {statistics && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { label: "Days traveled", value: statistics.totalDaysTraveled || 0, icon: Calendar },
              { label: "Cities visited", value: statistics.citiesVisited || 0, icon: MapPin },
              { label: "Countries", value: statistics.countriesVisited || 0, icon: Compass },
            ].map((stat, i) => (
              <div key={i} className="rounded-[1.25rem] bg-[var(--surface)] p-4 text-center" style={{ boxShadow: "0 4px 20px -2px rgba(0,0,0,0.05)" }}>
                <stat.icon className="w-5 h-5 text-[var(--peach)] mx-auto mb-2" />
                <p className="text-2xl font-bold text-[var(--ink)]">{stat.value}</p>
                <p className="text-xs text-[var(--muted)]">{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-[2rem] bg-[var(--surface)] p-8 space-y-6" style={{ boxShadow: "0 4px 20px -2px rgba(0,0,0,0.05)" }}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--ink)] flex items-center gap-2">
              <User className="w-4 h-4 text-[var(--muted)]" /> Name
            </label>
            <input
              type="text"
              value={profileData.name}
              onChange={(e) => setProfileData((p) => ({ ...p, name: e.target.value }))}
              className="w-full h-11 px-4 rounded-[1.25rem] border border-[rgba(41,37,36,0.06)] bg-[var(--bg)] text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--peach)] transition-all duration-300"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--ink)] flex items-center gap-2">
              <Mail className="w-4 h-4 text-[var(--muted)]" /> Email
            </label>
            <input
              type="email"
              value={profileData.email}
              disabled
              className="w-full h-11 px-4 rounded-[1.25rem] border border-[rgba(41,37,36,0.06)] bg-[var(--bg)] text-sm text-[var(--muted)] cursor-not-allowed"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--ink)]">Bio</label>
            <textarea
              value={profileData.bio}
              onChange={(e) => setProfileData((p) => ({ ...p, bio: e.target.value }))}
              placeholder="Tell us about your travel style..."
              rows={3}
              maxLength={500}
              className="w-full px-4 py-3 rounded-[1.25rem] border border-[rgba(41,37,36,0.06)] bg-[var(--bg)] text-sm text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--peach)] transition-all duration-300 resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--ink)]">Budget preference</label>
            <div className="grid grid-cols-3 gap-2">
              {["budget", "mid-range", "luxury"].map((level) => (
                <button
                  key={level}
                  onClick={() => setProfileData((p) => ({ ...p, preferences: { ...p.preferences, budget: level } }))}
                  className={`px-4 py-2 rounded-[1.25rem] text-sm capitalize transition-all duration-300 ${
                    profileData.preferences.budget === level
                      ? "bg-[var(--peach)] text-white font-medium"
                      : "bg-[var(--bg)] text-[var(--ink)] hover:bg-[var(--sage)]"
                  }`}
                >
                  {level === "mid-range" ? "Mid-range" : level}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--ink)]">Travel style</label>
            <div className="grid grid-cols-2 gap-2">
              {["adventure", "relaxation", "cultural", "business"].map((style) => (
                <button
                  key={style}
                  onClick={() => setProfileData((p) => ({ ...p, preferences: { ...p.preferences, travelStyle: style } }))}
                  className={`px-4 py-2 rounded-[1.25rem] text-sm capitalize transition-all duration-300 ${
                    profileData.preferences.travelStyle === style
                      ? "bg-[var(--peach)] text-white font-medium"
                      : "bg-[var(--bg)] text-[var(--ink)] hover:bg-[var(--sage)]"
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--ink)]">Interests</label>
            <div className="flex flex-wrap gap-2">
              {["museums", "nightlife", "nature", "food", "shopping", "history", "art"].map((interest) => (
                <button
                  key={interest}
                  onClick={() => {
                    const interests = profileData.preferences.interests || [];
                    const newInterests = interests.includes(interest)
                      ? interests.filter((i) => i !== interest)
                      : [...interests, interest];
                    setProfileData((p) => ({ ...p, preferences: { ...p.preferences, interests: newInterests } }));
                  }}
                  className={`px-3 py-1.5 rounded-full text-sm capitalize transition-all duration-300 ${
                    (profileData.preferences.interests || []).includes(interest)
                      ? "bg-[var(--lavender)] text-[var(--ink)] font-medium"
                      : "bg-[var(--bg)] text-[var(--muted)] hover:bg-[var(--sage)]"
                  }`}
                >
                  {interest}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleSaveProfile}
            disabled={saving}
            className="w-full h-11 rounded-[1.25rem] bg-[var(--peach)] text-white text-sm font-medium hover:opacity-90 transition-opacity duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save changes"}
          </button>

          <div className="border-t border-[rgba(41,37,36,0.06)] pt-4">
            <button
              onClick={handleLogout}
              className="w-full h-11 rounded-[1.25rem] border border-[rgba(41,37,36,0.06)] text-[var(--muted)] text-sm font-medium hover:bg-red-50 hover:text-red-500 transition-all duration-300 flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProfilePage;