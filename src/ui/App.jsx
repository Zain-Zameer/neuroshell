import React, { useState } from 'react'
import './App.css'
import Navbar from './components/navbar'
import MainContainer from './components/mainContainer'
import { Toaster } from 'react-hot-toast';

export default function App() {
  const [activateVoiceMode, setactivateVoiceMode] = useState(false)

  const [updateCDB, setupdateCDB] = useState(false)
  return (
    <div className='w-full h-full bg-[rgba(30,30,30,0.655)] rounded-[20px] shadow-xl overflow-hidden'>
    <Toaster position="top-center" />

    <Navbar setUpdateChroma={setupdateCDB} setVoice={activateVoiceMode}/>

    <MainContainer updateChroma={updateCDB} VoiceMode = {activateVoiceMode} setVoiceMode = {setactivateVoiceMode} />
    
    </div>
  )
}
