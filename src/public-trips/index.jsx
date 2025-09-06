import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/service/firebaseConfig';
import PublicTripCard from './components/PublicTripCard';
import { toast } from 'sonner';

function PublicTrips() {
  const [publicTrips, setPublicTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up real-time listener for public trips
    const q = query(
      collection(db, 'AITrips'),
      where('isPublic', '==', true)
    );
    
    // Use onSnapshot instead of getDocs for real-time updates
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const trips = [];
      querySnapshot.forEach((doc) => {
        // Make sure to include the ID in the data
        trips.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      setPublicTrips(trips);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching public trips:', error);
      toast.error('Failed to load public trips');
      setLoading(false);
    });
    
    // Clean up the listener when component unmounts
    return () => unsubscribe();
  }, []);

  return (
    <div className="p-10 md:px-20 lg:px-44 xl:px-56">
      <h1 className="text-3xl font-bold mb-6">Public Trips</h1>
      <p className="text-gray-600 mb-8">
        Explore trips shared by other travelers. Find inspiration or join a trip that interests you!
      </p>
      
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 bg-gray-200 rounded-lg animate-pulse"></div>
          ))}
        </div>
      ) : publicTrips.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {publicTrips.map((trip) => (
            <PublicTripCard key={trip.id} trip={trip} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <h3 className="text-xl font-medium mb-2">No public trips yet</h3>
          <p className="text-gray-500">
            Be the first to share your trip with the community!
          </p>
        </div>
      )}
    </div>
  );
}

export default PublicTrips;