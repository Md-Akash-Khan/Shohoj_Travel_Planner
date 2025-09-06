import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { generateTripCostEstimates } from '@/service/TripCostService';
import LocationSearch from '@/components/LocationSearch';

function TripCostCalculator({ trip }) {
  const [costs, setCosts] = useState({
    accommodation: 0,
    food: 0,
    transportation: 0,
    activities: 0,
    other: 0
  });
  
  const [totalCost, setTotalCost] = useState(0);
  const [numTravelers, setNumTravelers] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  // Remove the rawResponse state
  const [selectedDestination, setSelectedDestination] = useState(null);
  
  // Get destination name using the same approach as InfoSection
  const getDestinationName = () => {
    if (selectedDestination?.display_name) {
      return selectedDestination.display_name;
    } else if (trip?.userSelection?.location?.display_name) {
      return trip.userSelection.location.display_name;
    } else if (trip?.userSelection?.location?.label) {
      return trip.userSelection.location.label;
    }
    return null;
  };
  
  // Extract cost estimates from trip data and use Gemini API
  useEffect(() => {
    console.log("Trip object:", trip);
    
    if (trip?.userSelection) {
      try {
        // Set initial number of travelers from trip data if available
        if (trip?.userSelection?.traveler) {
          setNumTravelers(parseInt(trip.userSelection.traveler) || 1);
        }
        
        // Get basic trip information
        const daysCount = parseInt(trip?.userSelection?.noOfDays) || 1;
        const budgetLevel = trip?.userSelection?.budget || 'medium';
        
        // Get destination using the same approach as InfoSection
        const destination = getDestinationName();
        
        console.log("Trip data for cost calculation:", { daysCount, budgetLevel, destination });
        
        // Reset error state
        setError(null);
        
        // If we have a destination, use Gemini API
        if (destination) {
          fetchCostEstimates(destination, daysCount, budgetLevel);
        } else {
          setError("No destination specified. Please select a destination for your trip.");
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error processing trip data:", error);
        setError("Error processing trip data. Please try again later.");
        setIsLoading(false);
      }
    } else {
      setError("No trip data available. Please create a trip first.");
      setIsLoading(false);
    }
  }, [trip, selectedDestination]);
  
  // Handle destination selection from LocationSearch
  const handleDestinationChange = (place) => {
    setSelectedDestination(place);
    setError(null);
  };
  
  // Function to fetch cost estimates using our service
  const fetchCostEstimates = async (destination, daysCount, budgetLevel) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await generateTripCostEstimates(destination, daysCount, budgetLevel);
      
      if (result.success) {
        // Set costs based on AI response
        const finalCosts = {
          accommodation: Math.round(result.data.accommodation * daysCount),
          food: Math.round(result.data.food * daysCount),
          transportation: Math.round(result.data.transportation),
          activities: Math.round(result.data.activities * daysCount),
          other: 0
        };
        
        console.log("Final calculated costs from Gemini:", finalCosts);
        setCosts(finalCosts);
        // Remove setting the rawResponse
      } else {
        setError(result.error);
        // Remove setting the rawResponse
      }
    } catch (error) {
      console.error("Error fetching cost estimates:", error);
      setError(`Error fetching cost estimates: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Calculate total whenever costs or number of travelers changes
  useEffect(() => {
    const sum = Object.values(costs).reduce((acc, val) => acc + Number(val), 0);
    setTotalCost(Math.round(sum * numTravelers));
    console.log("Total cost calculated:", sum, "x", numTravelers, "=", sum * numTravelers);
  }, [costs, numTravelers]);
  
  const handleCostChange = (category, value) => {
    setCosts(prev => ({
      ...prev,
      [category]: value
    }));
  };
  
  return (
    <div className="my-6 sm:my-8 p-4 sm:p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl sm:text-2xl font-bold mb-4">Trip Cost Estimator</h2>
      
      {error && (
        <div className="mb-4 p-3 sm:p-4 bg-red-100 text-red-700 rounded-md text-sm">
          <p className="font-medium">Error:</p>
          <p>{error}</p>
          {error.includes("No destination specified") && (
            <div className="mt-4">
              <label className="block text-sm font-medium mb-1">Select a destination for your trip:</label>
              <LocationSearch selectProps={{ onChange: handleDestinationChange }} />
            </div>
          )}
        </div>
      )}
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Number of Travelers</label>
        <Input 
          type="number" 
          min="1" 
          value={numTravelers} 
          onChange={(e) => setNumTravelers(Math.max(1, parseInt(e.target.value) || 1))}
          className="w-full sm:w-1/2 md:w-1/3 lg:w-1/4"
        />
      </div>
      
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6">
          {Object.keys(costs).map((category) => (
            <div key={category} className="mb-2">
              <label className="block text-sm font-medium mb-1 capitalize">{category}</label>
              <div className="h-10 bg-gray-200 animate-pulse rounded-md"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6">
          {Object.entries(costs).map(([category, value]) => (
            <div key={category} className="mb-2">
              <label className="block text-sm font-medium mb-1 capitalize">{category}</label>
              <Input 
                type="number" 
                min="0" 
                value={value} 
                onChange={(e) => handleCostChange(category, Number(e.target.value))}
                disabled={category !== 'other'} // Only allow editing "other" costs
              />
            </div>
          ))}
        </div>
      )}
      
      <div className="bg-gray-100 p-3 sm:p-4 rounded-md">
        <div className="flex justify-between items-center">
          <span className="font-bold text-sm sm:text-base">Total Estimated Cost:</span>
          <span className="text-lg sm:text-xl font-bold">
            {isLoading ? (
              <div className="h-7 w-24 bg-gray-200 animate-pulse rounded-md"></div>
            ) : (
              `৳${totalCost.toLocaleString()}`
            )}
          </span>
        </div>
        <p className="text-xs sm:text-sm text-gray-500 mt-2">
          This is an estimate based on your trip details. Actual costs may vary.
        </p>
      </div>
      
      {/* Remove the rawResponse details section */}
      
      <div className="mt-4 text-sm text-gray-500">
        <p>* Accommodation costs are estimated for {trip?.userSelection?.noOfDays || 0} nights</p>
        <p>* Food costs include estimated meals for {trip?.userSelection?.noOfDays || 0} days</p>
        <p>* Transportation includes round-trip from Dhaka to {getDestinationName()?.split(',')[0] || trip?.userSelection?.location?.label} and local travel</p>
        <p>* Costs are shown in Bangladeshi Taka (BDT)</p>
        <p>* Estimates are based on location and budget preferences</p>
        <p className="mt-2 italic">* All cost estimates are generated by Google Gemini AI</p>
      </div>
    </div>
  );
}

export default TripCostCalculator;