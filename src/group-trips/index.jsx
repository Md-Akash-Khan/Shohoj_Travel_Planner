import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/service/firebaseConfig';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FiCalendar, FiUsers, FiDollarSign } from 'react-icons/fi';
import { fetchUnsplashImage } from '@/service/GlobalApi';

function GroupTrips() {
  const [joinedTrips, setJoinedTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [tripImages, setTripImages] = useState({});

  useEffect(() => {
    // Get current user from localStorage
    const user = localStorage.getItem('user');
    if (user) {
      setCurrentUser(JSON.parse(user));
      fetchJoinedTrips(JSON.parse(user));
    } else {
      setLoading(false);
    }
  }, []);

  // Fetch images for all trips
  useEffect(() => {
    const fetchImages = async () => {
      const imagePromises = joinedTrips.map(async (trip) => {
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
                return { tripId: trip.id, imageUrl: url };
              }
            } else if (response?.results && response.results.length > 0) {
              const url = response.results[0].urls?.regular;
              if (url) {
                return { tripId: trip.id, imageUrl: url };
              }
            }
          }
          return { tripId: trip.id, imageUrl: 'https://images.unsplash.com/photo-1500835556837-99ac94a94552' };
        } catch (error) {
          console.error('Error fetching location image:', error);
          return { tripId: trip.id, imageUrl: 'https://images.unsplash.com/photo-1500835556837-99ac94a94552' };
        }
      });
      
      const results = await Promise.all(imagePromises);
      const imagesMap = {};
      results.forEach(result => {
        imagesMap[result.tripId] = result.imageUrl;
      });
      
      setTripImages(imagesMap);
    };
    
    if (joinedTrips.length > 0) {
      fetchImages();
    }
  }, [joinedTrips]);

  const fetchJoinedTrips = async (user) => {
    if (!user || !user.email) {
      toast.error('Please sign in to view your joined trips');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // Query all trips first
      const q = query(
        collection(db, 'AITrips')
      );
      
      const querySnapshot = await getDocs(q);
      const trips = [];
      
      querySnapshot.forEach((doc) => {
        const tripData = doc.data();
        // Include trip if:
        // 1. User is in joinedUsers (regardless of public/private status), OR
        // 2. User is the trip owner (regardless of public/private status)
        if ((tripData.joinedUsers && 
             tripData.joinedUsers.some(u => u.email === user.email)) ||
            (tripData.userInfo && tripData.userInfo.email === user.email)) {
          trips.push({
            id: doc.id,
            ...tripData
          });
        }
      });
      
      setJoinedTrips(trips);
    } catch (error) {
      console.error('Error fetching joined trips:', error);
      toast.error('Failed to load your joined trips');
    } finally {
      setLoading(false);
    }
  };

  // Get destination name
  const getDestinationName = (trip) => {
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
    <div className="p-10 md:px-20 lg:px-44 xl:px-56">
      <h1 className="text-3xl font-bold mb-6">Group Trips</h1>
      <p className="text-gray-600 mb-8">
        These are trips created by other travelers that you've joined. Collaborate and plan together!
      </p>
      
      {!currentUser ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <h3 className="text-xl font-medium mb-2">Please sign in</h3>
          <p className="text-gray-500">
            You need to sign in to view your joined trips.
          </p>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 bg-gray-200 rounded-lg animate-pulse"></div>
          ))}
        </div>
      ) : joinedTrips.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {joinedTrips.map((trip) => (
            <div key={trip.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
              <Link to={`/view-trip/${trip.id}`}>
                <img 
                  src={tripImages[trip.id] || 'https://images.unsplash.com/photo-1500835556837-99ac94a94552'} 
                  alt={getDestinationName(trip)} 
                  className="w-full h-48 object-cover"
                />
              </Link>
              
              <div className="p-4">
                <Link to={`/view-trip/${trip.id}`}>
                  <h3 className="font-bold text-xl mb-2">{getDestinationName(trip)}</h3>
                </Link>
                
                <div className="flex flex-wrap gap-2 mb-3">
                  <div className="flex items-center text-sm text-gray-600">
                    <FiCalendar className="mr-1" />
                    {trip?.userSelection?.noOfDays} days
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <FiUsers className="mr-1" />
                    {trip?.userSelection?.traveler} traveler(s)
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <FiDollarSign className="mr-1" />
                    {trip?.userSelection?.budget} budget
                  </div>
                </div>
                
                <div className="flex items-center mb-4">
                  <img 
                    src={trip?.userInfo?.picture || '/user-placeholder.png'} 
                    alt="Host" 
                    className="w-6 h-6 rounded-full mr-2"
                  />
                  <span className="text-sm text-gray-600">
                    Shared by {trip?.userInfo?.name || 'Anonymous'}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-500">
                    {trip.joinedUsers ? trip.joinedUsers.length : 0} joined
                  </div>
                  
                  <Button 
                    variant="default"
                    onClick={() => window.location.href = `/view-trip/${trip.id}`}
                  >
                    View Trip
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <h3 className="text-xl font-medium mb-2">No joined trips yet</h3>
          <p className="text-gray-500">
            You haven't joined any trips yet. Browse public trips to find and join trips that interest you!
          </p>
          <Button 
            className="mt-4"
            onClick={() => window.location.href = '/public-trips'}
          >
            Browse Public Trips
          </Button>
        </div>
      )}
    </div>
  );
}

export default GroupTrips;