import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import CreateTrip from './create-trip/index.jsx'
import Header from './components/custom/Header.jsx'
import { Toaster } from './components/ui/sonner.jsx'
import { GoogleOAuthProvider } from '@react-oauth/google';
import Viewtrip from './view-trip/[tripId]/index.jsx'
import MyTrips from './my-trips/index.jsx'
import PublicTrips from './public-trips/index.jsx'
import GroupTrips from './group-trips/index.jsx'
import 'leaflet/dist/leaflet.css';
import { NotificationProvider } from '@/context/NotificationContext.jsx'
import Footer from './view-trip/components/Footer.jsx'
import AuthGuard from './components/auth/AuthGuard.jsx'

// Create a Layout component that includes Header
const Layout = ({ children }) => (
  <>
    <Header />
    {children}
    <Footer />
  </>
);

// Update router configuration to use Layout and AuthGuard
const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout><App /></Layout>
  },
  {
    path:'/create-trip',
    element: <Layout><AuthGuard><CreateTrip /></AuthGuard></Layout>
  },
  {
    path: '/view-trip/:tripId',
    element: <Layout><AuthGuard><Viewtrip /></AuthGuard></Layout>
  },
  {
    path: '/my-trips',
    element: <Layout><AuthGuard><MyTrips /></AuthGuard></Layout>
  },
  {
    path: '/public-trips',
    element: <Layout><PublicTrips /></Layout>
  },
  {
    path: '/group-trips',
    element: <Layout><AuthGuard><GroupTrips /></AuthGuard></Layout>
  }
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_AUTH_CLIENT_ID}>
      <NotificationProvider>
        <Toaster/>
        <RouterProvider router={router}/>
      </NotificationProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>,
)
