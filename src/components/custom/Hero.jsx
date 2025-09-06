import React from 'react'
import { Button } from '../ui/button'
import { Link } from 'react-router-dom'

function Hero() {
  return (
    <div className='flex flex-col items-center px-4 sm:px-8 md:px-16 lg:px-32 xl:px-56 gap-4 md:gap-8 lg:gap-9'>
      <h1 className='font-extrabold text-2xl sm:text-2xl md:text-6xl lg:text-[50px] text-center mt-6 md:mt-10'>
        <span className='text-[#2a1066]'>Discover Your Next Adventure with AI: </span>
        Personalized Itineraries at Your Fingertips
      </h1>

      <p className='text-base md:text-lg lg:text-xl text-gray-500 text-center'>
        Your personal trip planner and travel curator, creating custom itineraries tailored to your interests and budget.
      </p>

      <Link to={'/create-trip'}>
        <Button className="mt-2">Get Started, It's free</Button>
      </Link>

      <img 
        src="/landing3.png" 
        alt="Travel planning illustration" 
        className='w-full max-w-[350px] sm:max-w-[500px] md:max-w-[600px] lg:max-w-[750px] mt-4' 
      />
    </div>
  )
}

export default Hero