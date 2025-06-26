import React, { useEffect, useRef, useState } from 'react'
import SendBtnIcon from "../assets/sendBtn.png"
import VoiceBtnIcon from "../assets/voice.png"
import CrossIcon from "../assets/cross.png"
import OpenExploreIcon from "../assets/OpenExploreIcon2.png"
import targetBtnIcon from "../assets/target.png"
import { toast } from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import starIcon from "../assets/stars.png"
import sendVoice from "../assets/sendVoice.png"
import mindIcon from "../assets/mind.png"
import loadingIcon from "../assets/loading-anim.json"
import Lottie from 'lottie-react'
import agenticImg from "../assets/agents.png"

function mainContainer(props) {
  const [showLeft, setshowLeft] = useState(false)
  const [ExplorerWidth, setExplorerWidth] = useState("100%")
  const [userPrompt, setuserPrompt] = useState("")
  const [messagesHistory, setmessagesHistory] = useState([
  ]);

  useEffect(() => {
    console.log("Current Messages: ",messagesHistory)
  }, [messagesHistory])
  
  const [tempoHistory, settempoHistory] = useState([])

  useEffect(() => {
    if(props.updateChroma){
      window.electronAPI.saveToChroma(tempoHistory);
    }
  }, [props.updateChroma])

  const [agentBG, setagentBG] = useState("#1e201e")
  const [agentMode, setagentMode] = useState(false)
  
  const agentClicked = async()=>{
    setagentMode((prev)=>{
      let newVal = !prev
      setagentBG(newVal?"#383938":"#1e201e")
      toast(newVal?"Agent Activated":"Agent Deactivated")
      return newVal
    })
  }

  const explainOutput = async(e)=>{
    setmessagesHistory(prev=>[...prev,"Explain the last output."])

    let loading = document.createElement("div")
    loading.className = "w-30 text-center bg-[grey] p-1 dynamic-loading flex gap-2 items-center p-2 rounded-[20px]"
    let h3 = document.createElement("h3")
    h3.className = "listen-soft text-[black]"
    h3.textContent = "Explaining..."
    loading.appendChild(h3)
    chatBoxRef.current.appendChild(loading)
    

    let current_query = messagesHistory[e.target.id]
    let reply = await window.electronAPI.explainQuery(current_query);
    let target = chatBoxRef.current.querySelector(".dynamic-loading")
    if(target){
      chatBoxRef.current.removeChild(target)
    }
    setmessagesHistory(prev=>[...prev,['',reply]])


    
  }

  // const [isVoiceActive, setIsVoiceActive] = useState(false);
  const chatBoxRef = useRef(null)

  const [clickedContextualbtn, setclickedContextualbtn] = useState(false)
  const [contextOpacity,setcontextOpacity] = useState(1)

  const currentContextual = useRef(null)
  const [ExecutingContextual, setExecutingContextual] = useState(false)
  
  const executeMemory = async()=>{
    let target = chatBoxRef.current.querySelector(".dynamic-div-141")
    if(target){
      chatBoxRef.current.removeChild(target)
    }

    setmessagesHistory(prev=>[...prev,currentContextual.current])

    setExecutingContextual(true)
    let cmd = currentContextual.current
    let response = await window.electronAPI.execMyCMD(cmd)
    setExecutingContextual(false)
    console.log(response)
    setmessagesHistory(prev=>[...prev,[cmd,response]])
    
  }

  const [LoadingContextual, setLoadingContextual] = useState(false)
  

  const sendMemoryPrompt = async()=>{
    setLoadingContextual(true)
    setcontextOpacity(0.5)
    setclickedContextualbtn(true)
    let query = userPrompt
    setuserPrompt("")
    
    let memPrompt = await window.electronAPI.contextualPrompt(query)
    currentContextual.current = memPrompt

    

    let newDiv = document.createElement("div")
    newDiv.className = "dynamic-div-141 w-fit max-w-190 break-words bg-zinc-800 text-white rounded-2xl px-4 py-3 m-2 shadow-md text-sm text-gray-800 flex flex-col gap-4"
    let h3 = document.createElement("h3")
    h3.className = "font-medium whitespace-pre-wrap break-words"
    if(memPrompt!="404"){
      h3.textContent = memPrompt
    }
    else{
      h3.textContent = "No command found in my memory."
    }
    let bold = document.createElement('b')
    bold.textContent = "contextual~memory$ "
    newDiv.appendChild(bold)
    newDiv.appendChild(h3)
    
    if(memPrompt!="404"){
      let btn = document.createElement("button")
      btn.className = "border flex items-center justify-center gap-2 cursor-pointer border-gray-300 bg-white text-black px-3 py-1.5 rounded-xl text-sm font-medium hover:bg-gray-100 transition duration-200"
      btn.textContent = "Execute"
      newDiv.appendChild(btn)
      btn.onclick = executeMemory
    }
    
    setTimeout(() => {
      chatBoxRef.current.appendChild(newDiv)      
      setcontextOpacity(1)
      setclickedContextualbtn(false)
      setLoadingContextual(false)
    }, 2000);



  }


  const openExplorer = ()=>{
    setshowLeft((prev)=>!prev)
    if(showLeft){
      setExplorerWidth("100%")
    }else{
      setExplorerWidth("80%")
    }

  }

  const voiceModeHandler = async(e)=>{
    e.stopPropagation();
    props.setVoiceMode((prev)=>!prev)
    let textTranscript = await window.electronAPI.startListening();
    setuserPrompt(textTranscript)

    // trigger the send prompt button to automatically send the prompt  
    sendPrompt()
    
  }

  const [StrictColor, setStrictColor] = useState("#1c1c1c")
  const [strictMode, setstrictMode] = useState(false)
  const EnableStrictMode = ()=>{
      setStrictColor(prevColor => prevColor === "#1c1c1c" ? "black" : "#1c1c1c")
      setstrictMode(prev=>{
        let newVal = !prev
        toast(newVal?"Fly Mode Activated!":"Fly Mode Deactivated.")
        return newVal
      })
  }


  const sendPrompt = async()=>{
    if(userPrompt=='clear'){
      setmessagesHistory([])
      setuserPrompt('')
    }else{

    
    setmessagesHistory(prev=>[...prev,userPrompt])
    let userQuery = userPrompt
    setuserPrompt("")

    if(strictMode){
      let systemPrompt = {
    role: "system",
    content: `You are an AI that generates valid Windows shell commands (CMD or PowerShell) based on user requests and previous outputs.

Context:
- The user provides conversational requests like "Show what's in Music" or "List all processes"
- The assistant responds ONLY with valid shell commands (like dir, tasklist, etc.)
- Output responses from the user look like: ["<previous command>", "<its result>"]

Behavior:
- Track the last command and its output
- If the output is a folder listing and the user mentions a folder that was listed (e.g. Music), append it to the last command path (e.g. dir hoes → dir hoes\\Music)
- If the folder isn't in the last output, but is a known user directory (e.g. Downloads, Documents), use C:\\Users\\%USERNAME%\\<folder>
- If the request is not command-related or doesn't match any known logic, respond with: Sorry, no commands possible.

If the command says open up the vscode then you can open the vscode in user specified location with code <path> --new-window or you can open the vscode in the last correct path you went to

Only return a shell command like:
dir hoes\\Music
or
tasklist
or
Sorry, no commands possible.

Do not return any explanation or text. Just the exact command.`
  }
      
      let messages = []
      messagesHistory.map((message,index)=>{
        if(index%2===0){
          messages.push({'role':"user",'content':message})
        }else{
          messages.push({'role':"assistant",'content':JSON.stringify(message)})
        }
      })
      messages.push({'role':'user','content':userPrompt})   
      if(agentMode!==true){
        messages.unshift(systemPrompt)
      }
      // console.log(messages)

      let reply = await window.electronAPI.pingBackend(messages,strictMode,agentMode)
      if(reply[1].trim()===""){
        reply = "Executed Successfully."

      }
      setmessagesHistory(prev=>[...prev,['',reply]])


      if(agentMode!==true){
          let response = await window.electronAPI.tellmeCMD(userQuery)
          if(response!="None"){
            let d = new Date();
            let formattedDate = `${d.getDate()}-${d.getMonth()+1}-${d.getFullYear()}`; 
            let dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

            let desc = await window.electronAPI.tellMeCMDdesc(response)
            if(desc!="None"){
            let data = {
              date:formattedDate,
              command:response,
              description:desc,
              day:dayName
            }
            settempoHistory(prev=>[...prev,data])
            }
          }
      }
    
    }else{
      let reply = await window.electronAPI.pingBackend(userPrompt,strictMode,agentMode);

     
      if(reply[1].trim()===""){
          reply="Executed Successfully."
      }
      
      setmessagesHistory(prev=>[...prev,['',reply]])

      if(agentMode!=true){
          let response = await window.electronAPI.tellmeCMD(userQuery)
          if(response!="None"){
            let d = new Date();
            let formattedDate = `${d.getDate()}-${d.getMonth()+1}-${d.getFullYear()}`; 
            let dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

            let desc = await window.electronAPI.tellMeCMDdesc(response)
            if(desc!="None"){
            let data = {
              date:formattedDate,
              command:response,
              description:desc,
              day:dayName
            }
            settempoHistory(prev=>[...prev,data])
            }
          }
      }
    }

  }

  }

  useEffect(() => {
    console.log('Temporary Messages: ',tempoHistory)
  }, [tempoHistory])
  

  return (
    <div className='h-screen mt-2 flex gap-2'>
      
      {/* left container  */}
      {showLeft && <div className='w-1/5 showLeftOFF h-full'>

        {/* options  */}
        <div className='relative flex flex-col'>

          <div className='flex justify-between p-4'>
            <h3 className='text-[white] text-[30px]'>Explore</h3>
            <button onClick={openExplorer} className='cursor-pointer'>
              <img src={CrossIcon} className='w-5 fit object-contain' alt="" />
            </button>
          </div>
          
          {/* <div onClick={voiceModeHandler} className='relative mt-2 ml-5 mr-5 bg-[#1c1c1c]  border-[white] border-[1px] flex flex-wrap items-center gap-5 p-2 pl-5 justify-center pr-5 rounded-[15px] cursor-pointer hover:bg-[#212121]'>
            <img className='w-8' src={VoiceBtnIcon} alt="" />
            <h3 className='text-[white] text-[13px]'>Voice Chat</h3>
            {props.VoiceMode && <button onClick={voiceModeHandler} className='bg-[white] p-1 pl-2 pr-2 rounded-[20px] cursor-pointer hover:bg-[#e3e3e3] text-[12px] flex gap-2 justify-center items-center  z-50 relative'>send<img src={sendVoice} className='w-3' /></button>}
          </div> */}

          <div style={{backgroundColor:StrictColor}} onClick={EnableStrictMode} className='relative mt-3 ml-5 mr-5  border-[white] border-[1px] flex flex-wrap items-center gap-5 p-2 pl-5 justify-center pr-5 rounded-[15px] cursor-pointer strictBtn'>
            <img className='w-8' src={targetBtnIcon} alt="" />
            <h3 className='text-[white] text-[12px]'>Sky mode</h3>

          </div>

        </div>

      </div>}

      {!showLeft && 
      <div onClick={openExplorer} className='w-1/15 showLeftOFF h-full flex justify-center '>

       <button className="bg-white mt-5 cursor-pointer rounded-full w-12 h-12 flex items-center justify-center shadow">
        <img className="w-5 h-5 object-contain" src={OpenExploreIcon} alt="Explore" />
      </button>

      </div>

      }

      {/* right container  */}
      <div
        className='h-full flex flex-col justify-start'
        style={{ width: ExplorerWidth }}
      >
        <h3 className='text-center text-[30px] text-[white] font-[700]'>Neuroshell</h3>
        <p className='text-center text-[white] text-[14px]'>AI Shell to support your workflow with different development tasks.</p>
        {/*  chatbox container */}
        <div ref={chatBoxRef} className='border-[white] userpromptDesign border-[2px] m-5 h-118 rounded-tl-[20px] rounded-bl-[20px] overflow-scroll p-2 overflow-x-hidden'>

          {
            LoadingContextual &&
            <div className=' w-fill flex gap-2 items-center p-2 rounded-[20px]'>
              <h3 className='listen-soft text-[white]'>Searching...</h3>
              <Lottie className='w-12 object-fit' animationData={loadingIcon} loop={true} />
            </div>
          }

          {
            ExecutingContextual &&
             <div className=' w-fill flex gap-2 items-center p-2 rounded-[20px]'>
              <h3 className='listen-soft text-[white]'>Executing...</h3>
              <Lottie className='w-12 object-fit' animationData={loadingIcon} loop={true} />
            </div>
          }

          {/* user request  */}

          {messagesHistory.map((message,index)=>(
            <div className="w-fit max-w-190 break-words bg-zinc-800 text-white rounded-2xl px-4 py-3 m-2 shadow-md text-sm  flex flex-row gap-10">
              <h3 className='font-medium whitespace-pre-wrap break-words'><b>{index % 2 === 0 ? "user$ " : "neuroshell$ "}</b>{strictMode?<pre className='whitespace-pre-wrap break-words'>{index%2===0?message:message[1]}</pre>:<pre className='whitespace-pre-wrap break-words'>{index%2===0?message:message[1]}</pre>}</h3>
              
              {
              (index%2!=0 && (message[1][0]!="" && message[1]!="Executed Successfully." && message[1]!="Email has not sent successfully."))
              ?
              (
              <div>
              <button onClick={explainOutput} id={index} className='border flex items-center justify-center gap-2 cursor-pointer border-gray-300 bg-white text-black px-3 py-1.5 rounded-xl text-sm font-medium hover:bg-gray-100 transition duration-200'>Explain <img src={starIcon} className='w-5' alt="" /> </button></div>
              ):"" 
            }
            </div>
          ))}

          <div>

          </div>

        </div>

        {/* textArea container */}
          <div className="relative m-5">
            <textarea
              value={userPrompt}
              onChange={(e)=>setuserPrompt(e.target.value)}
              className="w-full userpromptDesign h-32 border-[2px] border-white rounded-[20px] pt-5 pl-5 pr-16 text-white text-[17px]  resize-none"
              placeholder="Copy docx documents from downloads folder and transfer it into the desktop"
            ></textarea>


            

            <button
              onClick={sendPrompt}
              className="absolute bottom-3 right-5 bg-[white] text-white px-4 py-2 cursor-pointer rounded-[12px] hover:bg-[#dbdbdb]"
            >
              <img className='w-7' src={SendBtnIcon} alt="" />
            </button>
            
            <button
              disabled = {clickedContextualbtn}
              onClick={sendMemoryPrompt}
              style={{opacity:contextOpacity}}
              className="absolute bottom-3 right-25 bg-[white]  text-white px-4 py-2 cursor-pointer rounded-[12px] hover:bg-[#dbdbdb]"
            >
              <img className='w-7' src={mindIcon} alt="" />
            </button>
            
            <button
              onClick={agentClicked}
              style={{backgroundColor:agentBG}}
              className="absolute bottom-3 left-6 border-[white] border-[1px]  text-white flex items-center gap-2 px-7 py-1 cursor-pointer rounded-[12px]"
            >
              Email Agent
              <img className='w-6' src={agenticImg} alt="" />
            </button>
            

        
        </div>
          
          

      </div>

    </div>
  )
}

export default mainContainer
