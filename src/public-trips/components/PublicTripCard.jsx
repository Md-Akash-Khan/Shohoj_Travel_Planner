import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FiCalendar, FiUsers, FiDollarSign } from 'react-icons/fi';
import { doc, updateDoc, arrayUnion, arrayRemove, onSnapshot } from 'firebase/firestore';
import { db } from '@/service/firebaseConfig';
import { toast } from 'sonner';
import { fetchUnsplashImage } from '@/service/GlobalApi';
import { createNotification } from '@/service/NotificationService';

function PublicTripCard({ trip }) {
  const [photoUrl, setPhotoUrl] = useState('/placeholder.jpg');
  const [isJoining, setIsJoining] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [hasJoined, setHasJoined] = useState(false);
  const [tripData, setTripData] = useState(trip);

  useEffect(() => {
    // Get current user from localStorage
    const user = localStorage.getItem('user');
    if (user) {
      setCurrentUser(JSON.parse(user));
    }
    
    // Set up real-time listener for this trip
    if (trip?.id) {
      const tripRef = doc(db, 'AITrips', trip.id);
      const unsubscribe = onSnapshot(tripRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
          const updatedTrip = docSnapshot.data();
          setTripData(updatedTrip);
          
          // Check if current user has joined this trip
          if (currentUser && updatedTrip.joinedUsers) {
            setHasJoined(updatedTrip.joinedUsers.some(u => u.email === currentUser.email));
          }
        }
      }, (error) => {
        console.error("Error listening to trip updates:", error);
      });
      
      return () => unsubscribe();
    }
  }, [trip?.id, currentUser]);
  
  // Check joined status when user or trip data changes
  useEffect(() => {
    if (currentUser && tripData?.joinedUsers) {
      setHasJoined(tripData.joinedUsers.some(u => u.email === currentUser.email));
    }
  }, [currentUser, tripData]);
    
  // Fetch image for the trip location
  useEffect(() => {
    const fetchImage = async () => {
      try {
        // Get the location name - try different properties to ensure we get something useful
        let locationName = '';
        
        if (tripData?.userSelection?.location?.label) {
          // Extract just the city/place name without country/region
          locationName = tripData.userSelection.location.label.split(',')[0].trim();
        } else if (tripData?.userSelection?.location?.display_name) {
          locationName = tripData.userSelection.location.display_name.split(',')[0].trim();
        } else if (tripData?.destination) {
          locationName = tripData.destination;
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
        setPhotoUrl('/placeholder.jpg');
      }
    };
    
    fetchImage();
  }, [tripData]);

  const handleJoinTrip = async () => {
    if (!currentUser) {
      toast.error('Please sign in to join this trip');
      return;
    }
    
    setIsJoining(true);
    try {
      const tripRef = doc(db, 'AITrips', tripData.id);
      const destinationName = getDestinationName();
      
      if (hasJoined) {
        // Leave the trip
        await updateDoc(tripRef, {
          joinedUsers: arrayRemove({
            email: currentUser.email,
            name: currentUser.name,
            picture: currentUser.picture
          })
        });
        toast.success('You have left this trip');
        
        // Send notification to trip creator
        if (tripData.userInfo && tripData.userInfo.email && tripData.userInfo.email !== currentUser.email) {
          await createNotification(
            tripData.userInfo.email,
            tripData.id,
            `${currentUser.name} has left your trip to ${destinationName}`,
            'leave',
            destinationName
          );
        }
        
        // Send notifications to other trip members
        if (tripData.joinedUsers && tripData.joinedUsers.length > 0) {
          const otherMembers = tripData.joinedUsers.filter(
            user => user.email !== currentUser.email && user.email !== tripData.userInfo?.email
          );
          
          for (const member of otherMembers) {
            await createNotification(
              member.email,
              tripData.id,
              `${currentUser.name} has left the trip to ${destinationName}`,
              'leave',
              destinationName
            );
          }
        }
      } else {
        // Join the trip
        await updateDoc(tripRef, {
          joinedUsers: arrayUnion({
            email: currentUser.email,
            name: currentUser.name,
            picture: currentUser.picture
          })
        });
        toast.success('You have joined this trip!');
        
        // Send notification to trip creator
        if (tripData.userInfo && tripData.userInfo.email && tripData.userInfo.email !== currentUser.email) {
          await createNotification(
            tripData.userInfo.email,
            tripData.id,
            `${currentUser.name} has joined your trip to ${destinationName}`,
            'join',
            destinationName
          );
        }
        
        // Send notifications to other trip members
        if (tripData.joinedUsers && tripData.joinedUsers.length > 0) {
          const otherMembers = tripData.joinedUsers.filter(
            user => user.email !== currentUser.email && user.email !== tripData.userInfo?.email
          );
          
          for (const member of otherMembers) {
            await createNotification(
              member.email,
              tripData.id,
              `${currentUser.name} has joined the trip to ${destinationName}`,
              'join',
              destinationName
            );
          }
        }
      }
    } catch (error) {
      console.error('Error joining/leaving trip:', error);
      toast.error(hasJoined ? 'Failed to leave trip' : 'Failed to join trip');
    } finally {
      setIsJoining(false);
    }
  };

  // Get destination name
  const getDestinationName = () => {
    if (tripData?.userSelection?.location?.display_name) {
      const fullDestination = tripData.userSelection.location.display_name;
      return fullDestination.includes(',') 
          ? fullDestination.split(',')[0].trim() 
          : fullDestination;
    } else if (tripData?.userSelection?.location?.label) {
      const fullDestination = tripData.userSelection.location.label;
      return fullDestination.includes(',') 
          ? fullDestination.split(',')[0].trim() 
          : fullDestination;
    }
    return "Trip";
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      <Link to={`/view-trip/${tripData?.id}`}>
        <img 
          src={photoUrl} 
          alt={getDestinationName()} 
          className="w-full h-48 object-cover"
        />
      </Link>
      
      <div className="p-4">
        <Link to={`/view-trip/${tripData?.id}`}>
          <h3 className="font-bold text-xl mb-2">{getDestinationName()}</h3>
        </Link>
        
        <div className="flex flex-wrap gap-2 mb-3">
          <div className="flex items-center text-sm text-gray-600">
            <FiCalendar className="mr-1" />
            {tripData?.userSelection?.noOfDays} days
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <FiUsers className="mr-1" />
            {tripData?.userSelection?.traveler} traveler(s)
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <FiDollarSign className="mr-1" />
            {tripData?.userSelection?.budget} budget
          </div>
        </div>
        
        <div className="flex items-center mb-4">
          <img 
            src={tripData?.userInfo?.picture || '/user-placeholder.png'} 
            alt="Host" 
            className="w-6 h-6 rounded-full mr-2"
          />
          <span className="text-sm text-gray-600">
            Shared by {tripData?.userInfo?.name || 'Anonymous'}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-500">
            {tripData.joinedUsers ? tripData.joinedUsers.length : 0} joined
          </div>
          
          <Button 
            variant={hasJoined ? "outline" : "default"}
            onClick={handleJoinTrip}
            disabled={isJoining}
            className={hasJoined ? "border-red-500 text-red-500 hover:bg-red-50" : ""}
          >
            {isJoining ? "Processing..." : hasJoined ? "Leave Trip" : "Join Trip"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default PublicTripCard;