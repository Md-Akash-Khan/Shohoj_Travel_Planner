import { db } from '@/service/firebaseConfig';
import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom';
import { doc, getDoc } from "firebase/firestore";
import { toast } from 'sonner';
import InfoSection from '../components/InfoSection';
import Hotels from '../components/Hotels';
import PlacesToVisit from '../components/PlacesToVisit';
import WeatherForecast from '../components/WeatherForecast';
import TripCostCalculator from '../components/TripCostCalculator';
import TripJournal from '../components/TripJournal';
import Footer from '../components/Footer';
import GroupChat from '../../group-trips/components/GroupChat';

function Viewtrip() {
    const { tripId } = useParams();
    const [trip, setTrip] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [hasJoined, setHasJoined] = useState(false);

    useEffect(() => {
        // Get current user from localStorage
        const user = localStorage.getItem('user');
        if (user) {
            setCurrentUser(JSON.parse(user));
        }
        
        tripId && GetTripData();
    }, [tripId]);

    useEffect(() => {
        // Check if current user has joined this trip
        if (currentUser && trip.joinedUsers) {
            setHasJoined(trip.joinedUsers.some(u => u.email === currentUser.email));
        }
    }, [currentUser, trip]);

    // used to get trip info from firebase
    const GetTripData = async () => {
        const docRef = doc(db, 'AITrips', tripId);
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
            console.log("Document: ", docSnap.data())
            setTrip(docSnap.data());
        }

        else {
            console.log("No such document")
            toast("No trip found")
        }
    }

    return (
        <div className='px-4 sm:px-6 md:px-10 lg:px-20 xl:px-32 py-6 md:py-10 max-w-7xl mx-auto'>
            {/* Information Section */}
            <InfoSection trip={trip} />

            {/* Weather Forecast */}
            <WeatherForecast trip={trip} />

            {/* Recommended Hotels */}
            <Hotels trip={trip} />

            {/* Daily Plan */}
            <PlacesToVisit trip={trip} />

            {/* Trip Journal */}
            <TripJournal trip={trip} />

            {/* Trip Cost Calculator */}
            <TripCostCalculator trip={trip} />

           
            
            {/* Show chat only if user has joined this trip and it's a group trip */}
            {hasJoined && trip.isPublic && trip.joinedUsers && trip.joinedUsers.length > 1 && (
                <GroupChat trip={trip} />
            )}
        </div>
    )
}

export default Viewtrip