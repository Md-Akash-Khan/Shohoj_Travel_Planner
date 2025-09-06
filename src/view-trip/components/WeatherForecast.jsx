import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FiSun, FiCloud, FiCloudRain, FiCloudSnow, FiWind, FiAlertTriangle } from 'react-icons/fi';
import { WiThunderstorm, WiDayHaze, WiDust } from 'react-icons/wi';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/context/NotificationContext';

function WeatherForecast({ trip }) {
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [showAlerts, setShowAlerts] = useState(false);
  const { refreshNotifications } = useNotifications();

  useEffect(() => {
    const fetchWeather = async () => {
      if (!trip?.userSelection?.location?.lat || !trip?.userSelection?.location?.lon) {
        setError("Location coordinates not available");
        setLoading(false);
        return;
      }
      
      try {
        // Fetch regular forecast data - using only the free API
        const forecastResponse = await axios.get(
          `https://api.openweathermap.org/data/2.5/forecast?lat=${trip.userSelection.location.lat}&lon=${trip.userSelection.location.lon}&units=metric&appid=${import.meta.env.VITE_OPENWEATHER_API_KEY}`
        );
        setWeatherData(forecastResponse.data);
        
        // Generate simulated alerts based on forecast data
        const simulatedAlerts = generateSimulatedAlerts(forecastResponse.data);
        setAlerts(simulatedAlerts);
        
        // Show toast notification if we have alerts
        if (simulatedAlerts.length > 0) {
          toast.warning(`Weather alert for ${trip?.userSelection?.location?.display_name || 'your trip location'}`, {
            description: `${simulatedAlerts.length} weather alerts detected. Check trip details for more information.`,
            duration: 6000,
          });
          
          // Store alert in notification system if trip has an ID
          if (trip?.id && trip?.userEmail && simulatedAlerts.length > 0) {
            storeAlertNotification(trip, simulatedAlerts[0]);
          }
        }
        
        setLoading(false);
      } catch (err) {
        console.error("Weather API error:", err);
        setError("Failed to fetch weather data");
        setLoading(false);
      }
    };

    if (trip?.userSelection?.location) {
      fetchWeather();
    }
  }, [trip]);
  
  // Function to generate simulated alerts based on forecast data
  const generateSimulatedAlerts = (forecastData) => {
    const alerts = [];
    
    if (!forecastData?.list || !forecastData.list.length) return alerts;
    
    // Check for extreme temperatures
    const highTempThreshold = 35; // °C
    const lowTempThreshold = 0; // °C
    
    // Check for heavy rain or snow
    const heavyRainThreshold = 10; // mm in 3 hours
    const heavySnowThreshold = 5; // mm in 3 hours
    
    // Check for strong winds
    const strongWindThreshold = 10; // m/s
    
    forecastData.list.forEach(forecast => {
      const date = new Date(forecast.dt * 1000);
      const temp = forecast.main.temp;
      const weatherId = forecast.weather[0].id;
      const windSpeed = forecast.wind.speed;
      const precipitation = forecast.rain?.['3h'] || forecast.snow?.['3h'] || 0;
      
      // High temperature alert
      if (temp >= highTempThreshold) {
        alerts.push({
          event: 'Extreme Heat Warning',
          description: `Temperatures expected to reach ${Math.round(temp)}°C on ${date.toLocaleDateString()}. Stay hydrated and avoid prolonged sun exposure.`,
          start: forecast.dt,
          end: forecast.dt + 10800, // 3 hours later
          severity: 'moderate',
          tags: ['heat', 'health']
        });
      }
      
      // Low temperature alert
      if (temp <= lowTempThreshold) {
        alerts.push({
          event: 'Freezing Temperature Alert',
          description: `Temperatures expected to drop to ${Math.round(temp)}°C on ${date.toLocaleDateString()}. Dress warmly and be cautious of icy conditions.`,
          start: forecast.dt,
          end: forecast.dt + 10800,
          severity: 'moderate',
          tags: ['cold', 'health']
        });
      }
      
      // Heavy rain alert
      if (forecast.rain?.['3h'] && forecast.rain['3h'] >= heavyRainThreshold) {
        alerts.push({
          event: 'Heavy Rainfall Warning',
          description: `Heavy rainfall of ${forecast.rain['3h']}mm expected on ${date.toLocaleDateString()}. Be prepared for potential flooding and difficult travel conditions.`,
          start: forecast.dt,
          end: forecast.dt + 10800,
          severity: 'moderate',
          tags: ['rain', 'flood']
        });
      }
      
      // Heavy snow alert
      if (forecast.snow?.['3h'] && forecast.snow['3h'] >= heavySnowThreshold) {
        alerts.push({
          event: 'Heavy Snowfall Warning',
          description: `Heavy snowfall of ${forecast.snow['3h']}mm expected on ${date.toLocaleDateString()}. Be prepared for difficult travel conditions and potential closures.`,
          start: forecast.dt,
          end: forecast.dt + 10800,
          severity: 'moderate',
          tags: ['snow', 'travel']
        });
      }
      
      // Strong wind alert
      if (windSpeed >= strongWindThreshold) {
        alerts.push({
          event: 'Strong Wind Advisory',
          description: `Strong winds of ${Math.round(windSpeed)}m/s expected on ${date.toLocaleDateString()}. Secure loose objects and be cautious when traveling.`,
          start: forecast.dt,
          end: forecast.dt + 10800,
          severity: 'minor',
          tags: ['wind', 'travel']
        });
      }
      
      // Thunderstorm alert
      if (weatherId >= 200 && weatherId < 300) {
        alerts.push({
          event: 'Thunderstorm Warning',
          description: `Thunderstorms expected on ${date.toLocaleDateString()}. Seek shelter indoors and avoid open areas.`,
          start: forecast.dt,
          end: forecast.dt + 10800,
          severity: 'severe',
          tags: ['thunderstorm', 'lightning']
        });
      }
    });
    
    // Remove duplicate alerts (same type for same day)
    const uniqueAlerts = [];
    const alertKeys = new Set();
    
    alerts.forEach(alert => {
      const day = new Date(alert.start * 1000).toLocaleDateString();
      const key = `${alert.event}-${day}`;
      
      if (!alertKeys.has(key)) {
        alertKeys.add(key);
        uniqueAlerts.push(alert);
      }
    });
    
    return uniqueAlerts;
  };
  
  // Function to store alert in the notification system
  const storeAlertNotification = async (trip, alert) => {
    try {
      const alertData = {
        tripId: trip.id,
        recipientEmail: trip.userEmail,
        message: `Weather Alert for ${getDestinationName()}: ${alert.event}`,
        details: alert.description,
        timestamp: new Date(),
        read: false,
        type: 'weather_alert'
      };
      
      // Add to Firestore notifications collection
      const response = await axios.post('/api/notifications', alertData);
      
      // Refresh notifications to show the new alert
      refreshNotifications();
    } catch (error) {
      console.error("Failed to store weather alert notification:", error);
    }
  };
  
  // Helper function to get destination name
  const getDestinationName = () => {
    // ... existing code ...
  };

  // Weather icon function
  const getWeatherIcon = (weatherCode) => {
    // Enhanced weather icons with larger size
    if (weatherCode >= 200 && weatherCode < 300) return <WiThunderstorm className="text-4xl text-purple-500" />;
    if (weatherCode >= 300 && weatherCode < 400) return <FiCloudRain className="text-4xl text-blue-400" />;
    if (weatherCode >= 500 && weatherCode < 600) return <FiCloudRain className="text-4xl text-blue-600" />;
    if (weatherCode >= 600 && weatherCode < 700) return <FiCloudSnow className="text-4xl text-sky-300" />;
    if (weatherCode >= 700 && weatherCode < 800) {
      if (weatherCode === 741) return <WiDayHaze className="text-4xl text-gray-400" />;
      if (weatherCode === 731 || weatherCode === 751 || weatherCode === 761) return <WiDust className="text-4xl text-yellow-700" />;
      return <FiWind className="text-4xl text-gray-500" />;
    }
    if (weatherCode === 800) return <FiSun className="text-4xl text-yellow-500" />;
    if (weatherCode > 800) return <FiCloud className="text-4xl text-gray-400" />;
    return <FiCloud className="text-4xl text-gray-400" />;
  };

  // Weather gradient function
  const getWeatherGradient = (weatherCode) => {
    // Return gradient classes based on weather condition
    if (weatherCode >= 200 && weatherCode < 300) return "bg-gradient-to-br from-indigo-500 to-purple-600"; // Thunderstorm
    if (weatherCode >= 300 && weatherCode < 400) return "bg-gradient-to-br from-blue-300 to-blue-400"; // Drizzle
    if (weatherCode >= 500 && weatherCode < 600) return "bg-gradient-to-br from-blue-400 to-blue-600"; // Rain
    if (weatherCode >= 600 && weatherCode < 700) return "bg-gradient-to-br from-blue-100 to-sky-300"; // Snow
    if (weatherCode >= 700 && weatherCode < 800) return "bg-gradient-to-br from-gray-300 to-gray-400"; // Atmosphere
    if (weatherCode === 800) return "bg-gradient-to-br from-yellow-300 to-orange-400"; // Clear
    if (weatherCode > 800) return "bg-gradient-to-br from-gray-100 to-gray-300"; // Clouds
    return "bg-gradient-to-br from-gray-100 to-gray-300"; // Default
  };

  // Text color function
  const getTextColor = (weatherCode) => {
    // Return text color based on weather condition
    if (weatherCode >= 200 && weatherCode < 300) return "text-white"; // Thunderstorm
    if (weatherCode >= 300 && weatherCode < 700) return "text-white"; // Drizzle, Rain, Snow
    if (weatherCode >= 700 && weatherCode < 800) return "text-gray-800"; // Atmosphere
    if (weatherCode === 800) return "text-gray-800"; // Clear
    if (weatherCode > 800) return "text-gray-800"; // Clouds
    return "text-gray-800"; // Default
  };

  if (loading) return (
    <div className="my-8">
      <h2 className="text-xl sm:text-2xl font-bold mb-4">Weather Forecast</h2>
      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse h-40 bg-gray-200 rounded-lg"></div>
        ))}
      </div>
    </div>
  );
  
  if (error) return (
    <div className="my-8">
      <h2 className="text-xl sm:text-2xl font-bold mb-4">Weather Forecast</h2>
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-500">{error}</div>
    </div>
  );

  // Group forecast by day
  const dailyForecasts = weatherData?.list?.reduce((acc, item) => {
    const date = new Date(item.dt * 1000).toLocaleDateString();
    if (!acc[date]) {
      acc[date] = item;
    }
    return acc;
  }, {});

  return (
    <div className="my-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl sm:text-2xl font-bold">Weather Forecast</h2>
      </div>
      
      {/* Weather Forecast Cards */}
      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
        {dailyForecasts && Object.entries(dailyForecasts).slice(0, 5).map(([date, forecast]) => {
          const weatherCode = forecast.weather[0].id;
          const gradientClass = getWeatherGradient(weatherCode);
          const textColorClass = getTextColor(weatherCode);
          
          return (
            <div key={date} className={`${gradientClass} p-4 rounded-lg shadow-lg transform transition-transform hover:scale-105 relative`}>
              <div className={`text-center ${textColorClass}`}>
                <p className="font-bold text-base sm:text-lg">
                  {new Date(date).toLocaleDateString('en-US', { weekday: 'short' })}
                </p>
                <p className="text-xs sm:text-sm opacity-80">
                  {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
                <div className="flex justify-center my-3">
                  {getWeatherIcon(weatherCode)}
                </div>
                <p className="font-bold text-lg sm:text-xl">{Math.round(forecast.main.temp)}°C</p>
                <div className="flex justify-between mt-2 text-xs opacity-90">
                  <span>H: {Math.round(forecast.main.temp_max)}°</span>
                  <span>L: {Math.round(forecast.main.temp_min)}°</span>
                </div>
                <p className="text-xs mt-1 font-medium capitalize">{forecast.weather[0].description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default WeatherForecast;