import React, { useEffect, useState } from 'react';
import { fetchUnsplashImage, fetchLatLngFromPlace } from '@/service/GlobalApi';

function HotelCardItem({ hotel }) {
  const [photoUrl, setPhotoUrl] = useState('/placeholder.jpg');
  const [mapUrl, setMapUrl] = useState('#');

  useEffect(() => {
    if (hotel?.name) {
      // Fetch image from Unsplash
      fetchUnsplashImage(hotel.name)
        .then(response => {
          const url = response.data?.results?.[0]?.urls?.regular;
          setPhotoUrl(url || '/placeholder.jpg');
        })
        .catch(() => setPhotoUrl('/placeholder.jpg'));

      // Fetch coordinates from OpenStreetMap
      const fullQuery = `${hotel.name}, ${hotel.address}`;
      fetchLatLngFromPlace(fullQuery)
        .then(data => {
          if (data) {
            const lat = data.lat;
            const lon = data.lon;
            setMapUrl(`https://www.google.com/maps/search/?api=1&query=${lat},${lon}`);
          } else {
            // fallback if coordinates not found
            setMapUrl(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullQuery)}`);
          }
        });
    }
  }, [hotel]);

  return (
    <a href={mapUrl} target='_blank' rel='noopener noreferrer'  onClick={(e) => e.stopPropagation()}>
      <div className='hover:scale-110 transition-all cursor-pointer mt-5 mb-8'>
        <img src={photoUrl} className='rounded-xl h-[180px] w-full object-cover' alt='Hotel' />
        <div className='my-2'>
          <h2 className='font-medium'>{hotel?.name}</h2>
          <h2 className='text-xs text-gray-500'>📍{hotel?.address}</h2>
          <h2 className='text-sm'>💰{hotel?.price}</h2>
          <h2 className='text-sm'>⭐{hotel?.rating}</h2>
        </div>
      </div>
    </a>
  );
}

export default HotelCardItem;
