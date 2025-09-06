import React, { useState } from 'react';
import axios from 'axios';

function LocationSearch({ selectProps }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);

  const searchPlaces = async (value) => {
    setQuery(value);

    if (value.length < 3) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await axios.get(
       `https://nominatim.openstreetmap.org/search`,
  {
    params: {
      format: 'json',
      q: value,
    },
    headers: {
      'User-Agent': 'ShohojTravel/1.0 (kmarafath0302@gmail.com)', // <- REQUIRED
    },
  }
      );
      setSuggestions(response.data);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
  };

  const handleSelect = (place) => {
    setQuery(place.display_name);
    setSuggestions([]);

    // Call the parent's onChange if provided
    if (selectProps?.onChange) {
      selectProps.onChange(place);
    }
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => searchPlaces(e.target.value)}
        placeholder="Search for a place"
        className="border p-2 w-full rounded"
      />
      {suggestions.length > 0 && (
        <ul className="absolute bg-white border w-full max-h-60 overflow-y-auto z-10">
          {suggestions.map((place, index) => (
            <li
              key={index}
              className="p-2 hover:bg-gray-100 cursor-pointer"
              onClick={() => handleSelect(place)}
            >
              {place.display_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default LocationSearch;
