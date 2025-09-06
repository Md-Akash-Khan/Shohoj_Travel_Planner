import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FiCalendar, FiUsers, FiDollarSign } from 'react-icons/fi';
import { fetchUnsplashImage } from '@/service/GlobalApi';

function UserTripCardItem({ trip }) {
  const [photoUrl, setPhotoUrl] = useState('/placeholder.jpg');
  
  // Fetch image for the trip location
  useEffect(() => {
    const fetchImage = async () => {
      try {
        // Get the location name - try different properties to ensure we get something useful
        let locationName = '';
        
        if (trip?.userSelection?.location?.label) {
          // Extract just the city/place name without country/region
          locationName = trip.userSelection.location.label.split(',')[0].trim();
        } else if (trip?.userSelection?.location?.display_name) {
          locationName = trip.userSelection.location.display_name.split(',')[0].trim();
        } else if (trip?.destination) {
          locationName = trip.destination;
        }
        
        if (locationName) {
          const response = await fetchUnsplashImage(locationName);
          
          // Check different possible response structures
          if (response?.data?.results && response.data.results.length > 0) {
            const url = response.data.results[0].urls?.regular;
            if (url) {
              setPhotoUrl(url);
            }
          } else if (response?.results && response.results.length > 0) {
            const url = response.results[0].urls?.regular;
            if (url) {
              setPhotoUrl(url);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching location image:', error);
        // Keep the placeholder image if there's an error
      }
    };
    
    fetchImage();
  }, [trip]);

  // Get destination name
  const getDestinationName = () => {
    if (trip?.userSelection?.location?.display_name) {
      const fullDestination = trip.userSelection.location.display_name;
      return fullDestination.includes(',') 
          ? fullDestination.split(',')[0].trim() 
          : fullDestination;
    } else if (trip?.userSelection?.location?.label) {
      const fullDestination = trip.userSelection.location.label;
      return fullDestination.includes(',') 
          ? fullDestination.split(',')[0].trim() 
          : fullDestination;
    }
    return "Trip";
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      <Link to={`/view-trip/${trip?.id}`}>
        <img 
          src={photoUrl} 
          alt={getDestinationName()} 
          className="w-full h-48 object-cover"
        />
      </Link>
      <div className="p-4">
        <Link to={`/view-trip/${trip?.id}`}>
          <h3 className="font-bold text-xl mb-2">{getDestinationName()}</h3>
        </Link>
        
        <div className="flex flex-wrap gap-2 mb-3">
          <div className="flex items-center text-sm text-gray-600">
            <FiCalendar className="mr-1" />
            {trip?.userSelection?.noOfDays} days
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <FiDollarSign className="mr-1" />
            {trip?.userSelection?.budget} budget
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserTripCardItem;
