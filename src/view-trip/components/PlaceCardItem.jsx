import React, { useEffect, useState } from 'react';
import { fetchUnsplashImage, fetchLatLngFromPlace } from '@/service/GlobalApi';

function PlaceCardItem({ place }) {
  const [photoUrl, setPhotoUrl] = useState('/placeholder.jpg');
  const [mapUrl, setMapUrl] = useState('');

  useEffect(() => {
    if (place?.place) {
      fetchUnsplashImage(place.place).then(res => {
        const url = res.data?.results?.[0]?.urls?.regular;
        setPhotoUrl(url || '/placeholder.jpg');
      });

      fetchLatLngFromPlace(place.place).then(data => {
        if (data) {
          const lat = data.lat;
          const lon = data.lon;
          setMapUrl(`https://www.google.com/maps/search/?api=1&query=${lat},${lon}`);
        } else {
          // fallback if coordinates not found
          setMapUrl(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.place)}`);
        }
      });
    }
  }, [place]);

  return (
    <a href={mapUrl} target="_blank" rel="noopener noreferrer">
      <div className='shadow-sm border rounded-xl p-3 mt-2 flex gap-5 hover:scale-105 hover:shadow-md cursor-pointer transition-all'>
        <img
          src={photoUrl}
          alt="Place"
          className='w-[130px] h-[130px] rounded-xl object-cover'
        />
        <div>
          <h2 className='font-bold text-lg'>{place.place}</h2>
          <p className='text-sm text-gray-500'>{place.details}</p>
          <h2 className='text-xs font-medium mt-2 mb-2'>🏷️Ticket: {place.ticket_pricing}</h2>
        </div>
      </div>
    </a>
  );
}

export default PlaceCardItem;
