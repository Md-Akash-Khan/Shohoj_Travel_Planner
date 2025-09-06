import axios from "axios";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

export const fetchUnsplashImage = (query) => {
  return axios.get(`https://api.unsplash.com/search/photos?query=${query}&client_id=${import.meta.env.VITE_UNSPLASH_ACCESS_KEY}`);
};

export const fetchLatLngFromPlace = async (query) => {
  const url = `${NOMINATIM_URL}?q=${encodeURIComponent(query)}&format=json&limit=1`;
  const response = await axios.get(url);
  return response.data?.[0] || null;
};
