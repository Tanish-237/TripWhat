const WEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;
const WEATHER_BASE_URL = "https://api.openweathermap.org/data/2.5";

export const fetchWeatherData = async (
  lat,
  lon,
  cityName = "",
  targetDate = null
) => {
  try {
    // If no API key is available, return mock data
    if (!WEATHER_API_KEY || WEATHER_API_KEY === "") {
      console.log(
        "Using mock weather data - add VITE_OPENWEATHER_API_KEY to .env for real data"
      );
      return getMockWeatherData(cityName, targetDate);
    }

    // If no target date is provided, get current weather
    if (!targetDate) {
      const response = await fetch(
        `${WEATHER_BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&units=metric`
      );

      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }

      const data = await response.json();

      return {
        temperature: Math.round(data.main.temp),
        feelsLike: Math.round(data.main.feels_like),
        humidity: data.main.humidity,
        description: data.weather[0].description,
        main: data.weather[0].main,
        windSpeed: Math.round(data.wind.speed * 10) / 10,
        city: cityName || data.name,
        icon: data.weather[0].icon,
        date: new Date().toLocaleDateString(),
      };
    }

    // For future dates, use the forecast API
    const now = new Date();
    const target = new Date(targetDate);
    const daysDiff = Math.ceil((target - now) / (1000 * 60 * 60 * 24));

    // OpenWeatherMap free tier provides 5-day forecast
    if (daysDiff > 5) {
      console.log(
        `Weather forecast not available for ${daysDiff} days ahead, using mock data`
      );
      return getMockWeatherData(cityName, targetDate);
    }

    if (daysDiff < 0) {
      // For past dates, we can't get actual historical weather with free API
      console.log("Using mock data for past dates");
      return getMockWeatherData(cityName, targetDate);
    }

    // Fetch 5-day forecast
    const response = await fetch(
      `${WEATHER_BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&units=metric`
    );

    if (!response.ok) {
      throw new Error(`Weather forecast API error: ${response.status}`);
    }

    const data = await response.json();

    // Find the forecast for the target date (closest match)
    const targetDateStr = target.toISOString().split("T")[0];
    let closestForecast = data.list[0]; // Default to first forecast

    for (const forecast of data.list) {
      const forecastDate = new Date(forecast.dt * 1000)
        .toISOString()
        .split("T")[0];
      if (forecastDate === targetDateStr) {
        closestForecast = forecast;
        break;
      }
    }

    return {
      temperature: Math.round(closestForecast.main.temp),
      feelsLike: Math.round(closestForecast.main.feels_like),
      humidity: closestForecast.main.humidity,
      description: closestForecast.weather[0].description,
      main: closestForecast.weather[0].main,
      windSpeed: Math.round(closestForecast.wind.speed * 10) / 10,
      city: cityName || data.city.name,
      icon: closestForecast.weather[0].icon,
      date: target.toLocaleDateString(),
    };
  } catch (error) {
    console.error("Weather fetch error:", error);
    return getMockWeatherData(cityName, targetDate);
  }
};

// Mock weather data for demo purposes
const getMockWeatherData = (
  cityName = "Current Location",
  targetDate = null
) => {
  const weatherTypes = [
    {
      main: "Clear",
      description: "clear sky",
      temp: 24,
      humidity: 45,
      wind: 2.1,
    },
    {
      main: "Clouds",
      description: "partly cloudy",
      temp: 22,
      humidity: 65,
      wind: 3.2,
    },
    {
      main: "Rain",
      description: "light rain",
      temp: 18,
      humidity: 85,
      wind: 4.5,
    },
    {
      main: "Clouds",
      description: "overcast clouds",
      temp: 20,
      humidity: 70,
      wind: 2.8,
    },
    {
      main: "Clear",
      description: "sunny",
      temp: 26,
      humidity: 40,
      wind: 1.8,
    },
    {
      main: "Thunderstorm",
      description: "thunderstorm",
      temp: 19,
      humidity: 90,
      wind: 5.2,
    },
  ];

  // Use date to create consistent weather for the same date
  let weatherIndex = 0;
  if (targetDate) {
    const dateStr = targetDate.toISOString().split("T")[0];
    // Create a simple hash from the date string for consistency
    weatherIndex =
      dateStr.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) %
      weatherTypes.length;
  } else {
    weatherIndex = Math.floor(Math.random() * weatherTypes.length);
  }

  const selectedWeather = weatherTypes[weatherIndex];

  return {
    temperature: selectedWeather.temp,
    feelsLike: selectedWeather.temp + Math.floor(Math.random() * 6) - 3,
    humidity: selectedWeather.humidity,
    description: selectedWeather.description,
    main: selectedWeather.main,
    windSpeed: selectedWeather.wind,
    city: cityName,
    icon: "01d", // Default icon
    date: targetDate
      ? targetDate.toLocaleDateString()
      : new Date().toLocaleDateString(),
  };
};

export const getWeatherTip = (weatherData) => {
  if (!weatherData) return "🌤️ Check back for weather updates!";

  const { main, description, temperature } = weatherData;

  if (main === "Rain" || description.includes("rain")) {
    return "🌧️ Don't forget your umbrella!";
  } else if (main === "Snow" || description.includes("snow")) {
    return "❄️ Bundle up and watch for snow!";
  } else if (temperature > 30) {
    return "🔥 Stay hydrated, it's hot out there!";
  } else if (temperature > 25) {
    return "☀️ Perfect weather for outdoor activities!";
  } else if (temperature < 5) {
    return "🧥 Bundle up, it's very cold today!";
  } else if (temperature < 15) {
    return "🧥 Consider bringing a jacket!";
  } else if (main === "Thunderstorm") {
    return "⛈️ Stay indoors if possible, storms ahead!";
  } else if (description.includes("fog") || description.includes("mist")) {
    return "🌫️ Be careful driving, visibility may be low!";
  } else {
    return "🌤️ Great weather for exploring!";
  }
};
