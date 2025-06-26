# 🧠 NeuroShell

**NeuroShell** is an AI-powered command-line interface that allows users to execute terminal commands using natural language — no more memorizing complex syntax. Built as part of an OS lab project, NeuroShell aims to redefine how humans interact with systems.

---

## 🚀 Features

### 🔹 Natural Language Command Execution
Write commands in plain English like:
> "Show all folders inside disk D"

NeuroShell understands your intent and executes the correct terminal command.

---

### 🔹 Fly Mode (Context-Aware Navigation)
NeuroShell remembers the current session context.

**Example:**
> User: "Show all folders inside disk D"  
> User: "Go to that particular folder"

✅ No need to retype full paths — Fly Mode intelligently navigates based on the prior command.

---

### 🔹 Contextual Memory
Recall and reuse past commands using natural language.

**Example:**
> "Run the Docker command I ran on Wednesday"

NeuroShell fetches and executes the exact command from its command history.

---

### 🔹 Email Agent
Automate email composition and sending:

- 📄 Email content from a file
- 🧠 Auto-generate email content from prompt
- ✉️ Send directly via SMTP

**Example:**
> "Send the contents of `notes.txt` to noperson@gmail.com"

---

## 🛠️ Tech Stack

### 🌐 Frontend
- HTML, CSS, Tailwind CSS
- React.js
- Electron.js

### ⚙️ Backend
- Python
- FastAPI

### 🤖 AI & NLP
- LangChain
- LLaMA 3.1 8B
- LLaMA 4 Scout
- HuggingFace Embeddings
- Retrieval-Augmented Generation (RAG)
- Chroma Vector Database

---

## 📽️ Demo

🎥 **Watch the full demo on YouTube:**  
[https://www.youtube.com/watch?v=4xKBvmRK-64&t=114s](https://www.youtube.com/watch?v=4xKBvmRK-64&t=114s)

---

## 💡 Future Improvements
- Voice input for hands-free command execution
- Multi-user memory isolation
- Secure authentication for email agent
