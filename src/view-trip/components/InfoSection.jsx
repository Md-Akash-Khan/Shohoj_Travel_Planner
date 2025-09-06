import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FiDownload, FiTrash2, FiGlobe, FiLock, FiMessageSquare } from 'react-icons/fi';
import { toast } from 'sonner';
import { doc, deleteDoc, updateDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/service/firebaseConfig';
import ShareTrip from './ShareTrip';
import GroupChat from '../../group-trips/components/GroupChat';
import { fetchUnsplashImage } from '@/service/GlobalApi';

function InfoSection({ trip }) {
  // State for storing the photo URL
  const [photoUrl, setPhotoUrl] = useState('https://images.unsplash.com/photo-1500835556837-99ac94a94552');
  const navigate = useNavigate();
  const [isPublic, setIsPublic] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [tripData, setTripData] = useState(trip);
  
  useEffect(() => {
    // Get current user from localStorage
    const user = localStorage.getItem('user');
    if (user) {
      setCurrentUser(JSON.parse(user));
    }
    
    // Set initial trip data
    setTripData(trip);
    
    // Check if trip is public
    if (trip?.isPublic) {
      setIsPublic(true);
    }
  }, [trip]);
  
  // Set up real-time listener for this trip
  useEffect(() => {
    if (trip?.id) {
      const tripRef = doc(db, 'AITrips', trip.id);
      const unsubscribe = onSnapshot(tripRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
          const updatedTrip = docSnapshot.data();
          setTripData(updatedTrip);
          setIsPublic(updatedTrip.isPublic || false);
        }
      }, (error) => {
        console.error("Error listening to trip updates:", error);
      });
      
      return () => unsubscribe();
    }
  }, [trip?.id]);
  
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
        
        console.log('Fetching image for location:', locationName);
        
        if (locationName) {
          const response = await fetchUnsplashImage(locationName);
          console.log('Unsplash response:', response);
          
          // Check different possible response structures
          if (response?.data?.results && response.data.results.length > 0) {
            const url = response.data.results[0].urls?.regular;
            if (url) {
              console.log('Setting photo URL to:', url);
              setPhotoUrl(url);
            }
          } else if (response?.results && response.results.length > 0) {
            const url = response.results[0].urls?.regular;
            if (url) {
              console.log('Setting photo URL to:', url);
              setPhotoUrl(url);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching location image:', error);
      }
    };
    
    fetchImage();
  }, [tripData?.userSelection?.location?.label, tripData?.userSelection?.location?.display_name, tripData?.destination]);
  
  // Extract destination name for the title
  const getDestinationName = () => {
    if (tripData?.userSelection?.location?.display_name) {
      // If location has display_name property (from LocationSearch)
      const fullDestination = tripData.userSelection.location.display_name;
      return fullDestination.includes(',') 
          ? fullDestination.split(',')[0].trim() 
          : fullDestination;
    } else if (tripData?.userSelection?.location?.label) {
      // Fallback to label if display_name is not available
      const fullDestination = tripData.userSelection.location.label;
      return fullDestination.includes(',') 
          ? fullDestination.split(',')[0].trim() 
          : fullDestination;
    }
    return "Your Trip";
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }).format(date);
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
    }
  };
  
  const handleDeleteTrip = async () => {
    if (!tripData?.id) return;
    
    if (confirm('Are you sure you want to delete this trip? This action cannot be undone.')) {
      try {
        const tripRef = doc(db, 'AITrips', tripData.id);
        await deleteDoc(tripRef);
        toast.success('Trip deleted successfully!');
        navigate('/'); // Navigate to home page after deletion
      } catch (error) {
        console.error('Error deleting trip:', error);
        toast.error('Failed to delete trip. Please try again.');
      }
    }
  };
  
  // Function to toggle trip public/private status
  const togglePublicStatus = async () => {
    if (!tripData?.id) return;
    
    setIsUpdating(true);
    try {
      const tripRef = doc(db, 'AITrips', tripData.id);
      
      // Get the latest trip data
      const tripSnap = await getDoc(tripRef);
      if (!tripSnap.exists()) {
        toast.error('Trip not found');
        return;
      }
      
      const currentTripData = tripSnap.data();
      const newStatus = !currentTripData.isPublic;
      
      // Update the trip with public status and user info
      await updateDoc(tripRef, {
        isPublic: newStatus,
        userInfo: currentUser ? {
          email: currentUser.email,
          name: currentUser.name,
          picture: currentUser.picture
        } : null,
        joinedUsers: currentTripData.joinedUsers || []
      });
      
      toast.success(newStatus ? 'Trip is now public!' : 'Trip is now private');
    } catch (error) {
      console.error('Error updating trip visibility:', error);
      toast.error('Failed to update trip visibility');
    } finally {
      setIsUpdating(false);
    }
  };
  
  // New function to export trip details as PDF
  const handleExportPDF = () => {
    if (!trip?.id) {
      toast.error('Trip data not available for export');
      return;
    }
    
    // Prepare for print
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow pop-ups to export trip details');
      return;
    }
    
    // Use the same destination name function for consistency
    const destinationName = getDestinationName();
    
    // Create content for the print window
    const tripDays = trip?.userSelection?.noOfDays || 'N/A';
    const tripBudget = trip?.userSelection?.budget || 'N/A';
    const tripTravelers = trip?.userSelection?.traveler || 'N/A';
    const tripStartDate = trip?.userSelection?.startDate ? formatDate(trip.userSelection.startDate) : 'Not specified';
    
    // Generate itinerary HTML
    let itineraryHTML = '';
    if (trip?.tripData?.itinerary) {
      itineraryHTML = '<h2 style="margin-top: 20px; font-size: 18px; font-weight: bold;">Itinerary</h2>';
      trip.tripData.itinerary.forEach(day => {
        itineraryHTML += `<h3 style="margin-top: 15px; font-size: 16px; font-weight: bold;">${day.day}</h3>`;
        itineraryHTML += '<ul style="list-style-type: disc; margin-left: 20px;">';
        day.plan.forEach(item => {
          itineraryHTML += `<li><strong>${item.time}</strong>: ${item.place} - ${item.description}</li>`;
        });
        itineraryHTML += '</ul>';
      });
    }
    
    // Create HTML content
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Trip to ${destinationName}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 20px; }
          .trip-details { margin-bottom: 20px; }
          .detail-item { margin-bottom: 10px; }
          @media print {
            .no-print { display: none; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Trip to ${destinationName}</h1>
          <p>Generated by ShohojTravel Planner</p>
        </div>
        
        <div class="trip-details">
          <h2>Trip Details</h2>
          <div class="detail-item"><strong>Destination:</strong> ${trip?.userSelection?.location?.label || destinationName}</div>
          <div class="detail-item"><strong>Start Date:</strong> ${tripStartDate}</div>
          <div class="detail-item"><strong>Duration:</strong> ${tripDays} days</div>
          <div class="detail-item"><strong>Budget Level:</strong> ${tripBudget}</div>
          <div class="detail-item"><strong>Number of Travelers:</strong> ${tripTravelers}</div>
        </div>
        
        ${itineraryHTML}
        
        <div class="no-print" style="margin-top: 30px; text-align: center;">
          <button onclick="window.print();" style="padding: 10px 20px; background: #0070f3; color: white; border: none; border-radius: 5px; cursor: pointer;">Print this page</button>
        </div>
      </body>
      </html>
    `;
    
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    toast.success('Trip details ready for export');
  };
  
  return (
    <div className="mb-10">
      {/* Add prominent trip title at the top */}
      <div className="mb-6 text-center">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary">
          {getDestinationName()} Trip
        </h1>
        <p className="text-sm sm:text-base text-gray-500 mt-2">
          {tripData?.userSelection?.startDate ? `Starting ${formatDate(tripData.userSelection.startDate)} • ` : ''}
          {tripData?.userSelection?.noOfDays ? `${tripData.userSelection.noOfDays} days` : ''} 
          {tripData?.userSelection?.traveler ? ` • ${tripData.userSelection.traveler} traveler${tripData.userSelection.traveler > 1 ? 's' : ''}` : ''}
          {tripData?.userSelection?.budget ? ` • ${tripData.userSelection.budget.charAt(0).toUpperCase() + tripData.userSelection.budget.slice(1)} budget` : ''}
        </p>
      </div>
      
      <img
        src={photoUrl}
        alt="Trip Location"
        className="h-[200px] sm:h-[250px] md:h-[300px] lg:h-[340px] w-full object-cover rounded-xl"
      />
      
      <div>
        <div className="my-5 flex flex-col gap-2">
          <h2 className="font-bold text-xl sm:text-2xl">{tripData?.userSelection?.location?.label}</h2>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <h2 className="p-1 px-2 sm:px-3 bg-gray-200 rounded-full text-gray-500 text-xs sm:text-sm">
              📅 {tripData.userSelection?.noOfDays} Day
            </h2>
            <h2 className="p-1 px-2 sm:px-3 bg-gray-200 rounded-full text-gray-500 text-xs sm:text-sm">
              💰 {tripData.userSelection?.budget} Budget
            </h2>
            <h2 className="p-1 px-2 sm:px-3 bg-gray-200 rounded-full text-gray-500 text-xs sm:text-sm">
              👥 No. of traveler/s: {tripData.userSelection?.traveler}
            </h2>
          </div>
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row flex-wrap justify-between items-start sm:items-center gap-4">
        {/* Add the ShareTrip component */}
        <ShareTrip trip={tripData} />
        
        <div className="flex flex-wrap gap-2">
          {/* Add Public/Private toggle button */}
          <Button 
            variant="outline" 
            onClick={togglePublicStatus}
            disabled={isUpdating}
            className={`flex items-center gap-1 text-xs sm:text-sm ${isPublic ? 'text-green-500 hover:bg-green-50' : 'text-blue-500 hover:bg-blue-50'}`}
          >
            {isPublic ? <FiLock /> : <FiGlobe />} 
            {isUpdating ? 'Updating...' : isPublic ? 'Make Private' : 'Share to Public'}
          </Button>
          
          {/* Add Export PDF button */}
          <Button 
            variant="outline" 
            onClick={handleExportPDF}
            className="flex items-center gap-1 text-xs sm:text-sm text-blue-500 hover:bg-blue-50"
          >
            <FiDownload /> Export PDF
          </Button>
          
          {/* Add Delete Trip button */}
          <Button 
            variant="outline" 
            onClick={handleDeleteTrip}
            className="flex items-center gap-1 text-xs sm:text-sm text-red-500 hover:bg-red-50"
          >
            <FiTrash2 /> Delete Trip
          </Button>
        </div>
      </div>
      
      {/* Show joined users regardless of public/private status */}
      {trip?.joinedUsers && trip.joinedUsers.length > 0 && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium mb-2">Joined Travelers ({trip.joinedUsers.length})</h3>
          <div className="flex flex-wrap gap-2">
            {trip.joinedUsers.map((user, index) => (
              <div key={index} className="flex items-center bg-white p-2 rounded-full shadow-sm">
                <img 
                  src={user.picture || '/user-placeholder.png'} 
                  alt={user.name} 
                  className="w-6 h-6 rounded-full mr-2"
                />
                <span className="text-sm">{user.name}</span>
              </div>
            ))}
          </div>
          
          {/* Add Chat Button */}
          {trip.joinedUsers.length > 1 && (
            <div className="mt-4">
              <Button
                onClick={() => setShowChat(!showChat)}
                className="flex items-center gap-2 bg-primary text-white hover:bg-primary/90"
              >
                <FiMessageSquare /> Open Group Chat
              </Button>
            </div>
          )}
        </div>
      )}
      
      {/* Render GroupChat component conditionally based on showChat state, not isPublic */}
      {showChat && trip?.joinedUsers && trip.joinedUsers.length > 1 && (
        <div className="mt-4">
          <GroupChat trip={trip} />
        </div>
      )}
    </div>
  );
}

export default InfoSection;
