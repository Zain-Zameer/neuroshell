import {app,BrowserWindow, ipcMain,Menu} from "electron"
import path from "path"
import { isDev } from "./util.js";
import { getPreloadPath } from "./pathResolver.js";
import axios from "axios"
import {exec} from "child_process"
import util from "util"
import { spawn } from 'child_process';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import stream from 'stream';

// nvidia's llm api key, makesure you hide it
const API_KEY = "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";

let mainWindow;


app.on("ready",()=>{
    mainWindow = new BrowserWindow({
        width: 981,     
        height: 790,      
        frame: false,
        minWidth: 981,   
        minHeight: 780, 
        transparent:true,
        hasShadow: true,
         webPreferences:{
            preload:getPreloadPath(),
            contextIsolation: true,
            nodeIntegration: false, 
        }

      });
    mainWindow.webContents.openDevTools({ mode: "detach" });
    if(isDev()){
        mainWindow.loadURL("http://localhost:5123")
    }
    else{
        mainWindow.loadFile(path.join(app.getAppPath(),'/dist-react/index.html'))
    }

    Menu.setApplicationMenu(null);
})


// llm functionality
async function callNvidiaLLM(userMessage) {
  try {
    const response = await axios.post(
      "https://integrate.api.nvidia.com/v1/chat/completions",
      {
        model: "meta/llama-4-scout-17b-16e-instruct",
        messages: [
          {
            role: "system",
            content : `You are an AI that converts user input written in natural language into a clean, executable Windows command-line (CMD or PowerShell) command.  
                        Only respond with the corresponding command.  
                        If no valid or meaningful command can be generated, reply with:  
                        "Sorry, no command possible for it."  
                        Do not add any explanation, just the command or that exact error message.  
                        If the command needs to reference the current user's name or folder, use %USERNAME% (the correct Windows environment variable), not any other format.
                        If the command says open up the vscode then you can open the vscode in user specified location with code <path> --new-window
                        `,
          },
          {
            role: "user",
            content: userMessage
          }
        ],
        temperature: 0.2,
        top_p: 0.7,
        max_tokens: 1024
      },
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    return response.data.choices[0].message.content
  } catch (error) {
    console.log("❌ Error:", error.response?.data || error.message)
  }
}

ipcMain.handle("talk-in-cmd",async(event,userPrompt)=>{
  let response = await callNvidiaLLM(userPrompt)
  if (response !== "Sorry, no commands possible.") {
    return response;
  }
  return "None";
})


async function chatWithNvidiaDescriptionCMD(messages) {
  try {
    const res = await axios.post(
      "https://integrate.api.nvidia.com/v1/chat/completions",
      {
        model: "meta/llama-4-scout-17b-16e-instruct",
        messages,
        temperature: 0.2,
        top_p: 0.7,
        max_tokens: 256
      },
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const reply = res.data.choices[0].message.content.trim();
    console.log(reply);
    return reply;
  } catch (err) {
    console.error("Error chatting with NVIDIA:", err.response?.data || err.message);
  }
}

ipcMain.handle("send_desc_cmd",async(event,command)=>{
const messages = [
  {
    role: "system",
    content: "You are a helpful AI assistant that writes a clear description in 2 or 3 lines only of shell commands that what purpose this shell command does. Give simple string format output with no markdown or extra designing. If no command possible you can return 'None' "
  },
  {
    role: "user",
    content: command
  }
];
  let response = await chatWithNvidiaDescriptionCMD(messages)
  return response
})





// fly llm
async function chatWithNvidiaHistory(messages) {
  try {
    const res = await axios.post(
      "https://integrate.api.nvidia.com/v1/chat/completions",
      {
        model: "meta/llama-4-scout-17b-16e-instruct",
        messages,
        temperature: 0.2,
        top_p: 0.7,
        max_tokens: 1024
      },
      {
        headers: {
          "Authorization": `Bearer ${API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const reply = res.data.choices[0].message.content;
    return reply;
  } catch (err) {
    console.error("Error chatting with LLAMA:", err.response?.data || err.message);
  }
}



// assembly ai working to get the audio and then the transcript of it
ffmpeg.setFfmpegPath(ffmpegPath);

const INPUT_DEVICE = 'Microphone (Realtek(R) Audio)';
const apiKey = '44cecc0de9f049ee804dc247c388f4a3';

const headers = {
  authorization: apiKey,
  'transfer-encoding': 'chunked',
  'content-type': 'application/octet-stream'
};


async function recordAndTranscribe() {
  try {
    console.log("🎙️ Starting recording...");

    // 1. Start SoX process
    const sox = spawn('sox', [
      '-t', 'waveaudio',
      INPUT_DEVICE,
      '-c', '1',
      '-r', '44100',
      '-b', '16',
      '-t', 'wav', '-', // output raw WAV to stdout
      'silence', '1', '0.1', '1%', '1', '4.0', '1%' // stop after 4s of silence
    ]);

    // 2. Convert to MP3 using ffmpeg (output to stream)
    const mp3Stream = new stream.PassThrough();

    const ffmpegProc = ffmpeg()
      .input(sox.stdout)
      .inputFormat('wav')
      .audioCodec('libmp3lame')
      .format('mp3')
      .on('error', (err) => {
        console.error('❌ FFmpeg error:', err.message);
      })
      .pipe(mp3Stream);

    const uploadResponse = await axios.post(
      'https://api.assemblyai.com/v2/upload',
      mp3Stream,
      { headers }
    );

    const audioUrl = uploadResponse.data.upload_url;

    const transcript = await axios.post(
      'https://api.assemblyai.com/v2/transcript',
      { audio_url: audioUrl },
      { headers: { authorization: apiKey } }
    );

    const transcriptId = transcript.data.id;
    const pollingEndpoint = `https://api.assemblyai.com/v2/transcript/${transcriptId}`;

    console.log("🕒 Waiting for transcription...");

    while (true) {
      const pollingRes = await axios.get(pollingEndpoint, { headers: { authorization: apiKey } });

      if (pollingRes.data.status === 'completed') {
        return pollingRes.data.text
      } else if (pollingRes.data.status === 'error') {
        throw new Error(`Transcription failed: ${pollingRes.data.error}`);
      } else {
        process.stdout.write('.');
        await new Promise((r) => setTimeout(r, 3000));
      }
    }

  } catch (err) {
    console.error('❌ Error:', err.message || err);
  }
}


ipcMain.handle("start-listening",async (event)=>{
  let text = await recordAndTranscribe();
  return text;
})

ipcMain.handle('memory-query',async(event,query)=>{
  const response = await axios.get(`http://0.0.0.0:8000/contextualMemory/${query}`);
  return response.data;
})

ipcMain.handle("save-messages-chroma",async(event,messages)=>{
  const response = await axios.post('http://0.0.0.0:8000/api/updateChroma',messages)

})

const execAsync = util.promisify(exec);

ipcMain.handle('ping-backend', async (event, arg,strict_,agent_) => {
  console.log('Message from backend: User Prompt: ',arg,', Strict Mode: ',strict_, " agent mode: ",agent_)
  
  if(agent_===true){
    console.log("running agent...")
    if(strict_==true){
      let response = await axios.get(`http://0.0.0.0:8000/api/sendEmailviaLLM/${arg}`)
    }else{
      let response = await axios.get(`http://0.0.0.0:8000/api/sendEmailviaLLM/${arg}`)
      return response.data
    }
  }
  else if(strict_==false && agent_==false){
      let response = await callNvidiaLLM(arg);
      
      if (response !== "Sorry, no command possible for it.") {
      try {
        let { stdout, stderr } = await execAsync(response);

        if (stderr) {
          return ['',stderr];
        }
        
        return [response,stdout]

      } catch (error) {
        return ['',error.message];
      }
    }
    return ['',response];
  }
  else if(strict_==true && agent_==false){
    let response = await chatWithNvidiaHistory(arg);
      
      if (response !== "Sorry, no commands possible.") {
      try {
        let { stdout, stderr } = await execAsync(response);

        if (stderr) {
          return ['',stderr];
        }
        
        return [response,stdout]

      } catch (error) {
        return ['',error.message];
      }
    }
    return ['',response];
  }
  

});


ipcMain.handle("run-my-cmd",async(event,command)=>{
  let { stdout, stderr } = await execAsync(command);
  if (stderr) {
        console.error("⚠️ Stderr:", stderr);
        return stderr;
  }
  return stdout
})

// Explain LLM
async function explainLLM(query) {
  try {
    const response = await axios.post(
      "https://integrate.api.nvidia.com/v1/chat/completions",
      {
        model: "meta/llama-4-scout-17b-16e-instruct",
        messages: [
          {
            role: "system",
            content : `You are an AI that explains the output of a shell command (Windows CMD or PowerShell).
                      The user will give you:
                      - The command they ran
                      - The output it returned

                      Your job is to explain what the **output** means in a clear, beginner-friendly way. Only explain the output — not the command itself.

                      If the output is a list (like folders or files), describe it simply and clearly.  
                      Do **not guess** what any folder, file, or text might mean. Just describe what's there.  
                      If something is unclear, say exactly what is shown without interpretation.

                      ⚠️ Do not use Markdown or any formatting like asterisks, bullet points, or code blocks in your reply. Return plain text only.

                      ✅ Format your response like this:
                      Command ran: <command>  
                      Output explains: <friendly, simple explanation of just the output>
                      `,
          },
          {
            role: "user",
            content: `Command I ran in shell is ${query[0]} and here's the output of it: ${query[1]}`
          }
        ],
        temperature: 0.2,
        top_p: 0.7,
        max_tokens: 1024
      },
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    return response.data.choices[0].message.content
  } catch (error) {
    console.log("❌ Error:", error.response?.data || error.message)
  }
}


ipcMain.handle('explain-query',async(event,query)=>{
  let response = await explainLLM(query);
  return response 
})




ipcMain.on('close-window', () => {
  BrowserWindow.getFocusedWindow()?.close();
});

ipcMain.on('maximize-window', () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) {
    win.isMaximized() ? win.unmaximize() : win.maximize();
  }
});

ipcMain.on('minimize-window', () => {
  BrowserWindow.getFocusedWindow()?.minimize();
});