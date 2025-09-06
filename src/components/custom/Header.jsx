import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useGoogleLogin, googleLogout } from '@react-oauth/google';
import axios from 'axios';
import { FcGoogle } from 'react-icons/fc';
import { FiMenu, FiX } from 'react-icons/fi';
import NotificationPanel from './NotificationPanel';
import { Link } from 'react-router-dom';

function Header() {
  const user = JSON.parse(localStorage.getItem('user'));
  const [openDialog, setOpenDialog] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    console.log(user)
  })

  const login = useGoogleLogin({
    onSuccess: (res) => GetUserProfile(res),
    onError: (error) => console.log(error)
  })

  const GetUserProfile = (tokenInfo) => {
    axios.get(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${tokenInfo.access_token}`, {
      headers: {
        Authorization: `Bearer ${tokenInfo.access_token}`,
        Accept: 'application/json',
      },
    }).then((resp) => {
      console.log(resp);
      localStorage.setItem('user', JSON.stringify(resp.data));
      setOpenDialog(false);
      window.location.reload();
    }).catch((error) => {
      console.error("Error fetching user profile: ", error);
    });
  }

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const NavLinks = () => (
    <>
      <Link to="/create-trip" onClick={closeMobileMenu}>
        <Button variant="outline" className="rounded-full w-full md:w-auto">+ Create Trip</Button>
      </Link>
      <Link to="/my-trips" onClick={closeMobileMenu}>
        <Button variant="outline" className="rounded-full w-full md:w-auto">My Trips</Button>
      </Link>
      <Link to="/group-trips" onClick={closeMobileMenu}>
        <Button variant="outline" className="rounded-full w-full md:w-auto">Group Trips</Button>
      </Link>
      <Link to="/public-trips" onClick={closeMobileMenu}>
        <Button variant="outline" className="rounded-full w-full md:w-auto">Public Trips</Button>
      </Link>
    </>
  );

  return (
    <div className='shadow-sm flex justify-between items-center px-4 sm:px-6 py-3'>
      <Link to="/" className="flex items-center">
        <img 
          src="/logo1.png" 
          alt="ShohojTravel Planner Logo" 
          className="h-14 sm:h-16 md:h-20 object-contain" 
        />
      </Link>
      
      {user ? (
        <>
          {/* Desktop Navigation */}
          <div className='hidden md:flex items-center gap-2 lg:gap-3'>
            <NavLinks />
            <NotificationPanel />
            
            <Popover>
              <PopoverTrigger>             
                <img src={user?.picture} alt="" className='h-[35px] w-[35px] rounded-full' />
              </PopoverTrigger>
              <PopoverContent>
                <h2 className='cursor-pointer' onClick={()=>{
                  googleLogout();
                  localStorage.clear();
                  window.location.reload();
                }}>Logout</h2>
              </PopoverContent>
            </Popover>
          </div>
          
          {/* Mobile Menu Button */}
          <div className='flex items-center gap-2 md:hidden'>
            <NotificationPanel />
            
            <Popover>
              <PopoverTrigger>             
                <img src={user?.picture} alt="" className='h-[35px] w-[35px] rounded-full' />
              </PopoverTrigger>
              <PopoverContent>
                <h2 className='cursor-pointer' onClick={()=>{
                  googleLogout();
                  localStorage.clear();
                  window.location.reload();
                }}>Logout</h2>
              </PopoverContent>
            </Popover>
            
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleMobileMenu}
              className="md:hidden"
            >
              {mobileMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
            </Button>
          </div>
          
          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className='fixed inset-0 top-[60px] bg-white z-50 p-4 flex flex-col gap-4 md:hidden'>
              <NavLinks />
            </div>
          )}
        </>
      ) : (
        <Button onClick={()=>setOpenDialog(true)}>Sign In</Button>
      )}

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogDescription>
              <img 
                src="/logo1.png" 
                alt="ShohojTravel Planner Logo" 
                className="h-16 sm:h-20 w-auto object-contain mx-auto mb-4" 
              />
              <h2 className='font-bold text-lg'>Sign In to check out your travel plan</h2>
              <p>Sign in to the App with Google authentication securely</p>
              <Button
                onClick={login}
                className="w-full mt-6 flex gap-4 items-center">
                <FcGoogle className="h-7 w-7" />Sign in With Google
              </Button>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Header;