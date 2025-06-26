import React, { useState,useRef  } from 'react'
import Lottie from 'lottie-react';
import SiriAnimation from "../assets/siriAnimation.json"
import closeImg from "../assets/close.png"
import maximizeImg from "../assets/maximize.png"
import minimizeImg from "../assets/minimize-sign.png"
import { toast } from 'react-hot-toast';

export default function navbar(props) {
  const [currentPath, setcurrentPath] = useState("zain@neuroshell-desktop:~")

  const closeWindow = ()=>{
    props.setUpdateChroma(true)
    window.electronAPI.closeWindow()
  }
  const maximizeWindow = ()=>{
    window.electronAPI.maximizeWindow()
  }
  const minimizeWindow = ()=>{
    window.electronAPI.minimizeWindow();
  }

  const copyCurrentPath = ()=>{
    navigator.clipboard.writeText(currentPath)
    toast.success("Path copied!");
  }
  return (
    <div className='h-10 userpromptDesign flex justify-between items-center myNavi'>

      <div className="flex items-center space-x-2 p-3">
        <div onClick={closeWindow} className="w-3 h-3 rounded-full bg-red-500 cursor-pointer hover-group myBtn">
          <img src={closeImg} alt="" className="w-3 hidden-on-hover" />
        </div>
        <div onClick={maximizeWindow} className="w-3 h-3 rounded-full bg-yellow-500 cursor-pointer hover-group myBtn">
          <img src={maximizeImg} alt="" className="w-3 hidden-on-hover"/>

          </div>  {/* Maximize */} 
        <div onClick={minimizeWindow} className="w-3 h-3 rounded-full bg-green-500 cursor-pointer flex items-center justify-center hover-group myBtn">
  <img src={minimizeImg} alt="" className="w-2 h-2 hidden-on-hover" />
</div>

        
      </div>


      
      <div className="flex justify-between items-center w-full px-4">
  {/* Left side (static prompt) */}
  <h3 
  onClick={copyCurrentPath}
  title={currentPath}
  className='text-white text-[12px] truncate w-70 cursor-pointer z-30 myBtn' >{currentPath}</h3>

  {/* Right side (conditionally rendered, but always reserving space) */}
  <div className="flex items-center gap-2 pr-5 min-w-[120px] justify-end">
    {props.setVoice ? (
      <>
        <h3 className="listen-soft">Listening..</h3>
        <Lottie className='w-7 object-fit' animationData={SiriAnimation} loop={true} />
      </>
    ) : null}
  </div>
</div>


    </div>
  )
}
