const electron = require("electron");

electron.contextBridge.exposeInMainWorld('electronAPI', {
  pingBackend: (message,strict_,agent_) => electron.ipcRenderer.invoke('ping-backend', message,strict_,agent_),
  closeWindow: () => electron.ipcRenderer.send('close-window'),
  minimizeWindow: () => electron.ipcRenderer.send('minimize-window'),
  maximizeWindow: () => electron.ipcRenderer.send('maximize-window'),
  explainQuery:(query)=>electron.ipcRenderer.invoke('explain-query',query),
  
  startListening: () => electron.ipcRenderer.invoke('start-listening'),
  
  contextualPrompt:(query)=>electron.ipcRenderer.invoke("memory-query",query),

  execMyCMD:(command)=>electron.ipcRenderer.invoke("run-my-cmd",command),
  
  tellmeCMD:(userPrompt)=>electron.ipcRenderer.invoke("talk-in-cmd",userPrompt),
  
  tellMeCMDdesc:(command)=>electron.ipcRenderer.invoke("send_desc_cmd",command),

  saveToChroma:(messages)=>electron.ipcRenderer.invoke("save-messages-chroma",messages)
  
});