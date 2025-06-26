from fastapi import FastAPI,Request
import os
from dotenv import load_dotenv
import subprocess
from langchain import hub
from langchain.agents import AgentExecutor, create_react_agent
from langchain.chains import create_history_aware_retriever, create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain_community.vectorstores import Chroma
from langchain_core.messages import AIMessage, HumanMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.tools import Tool
from langchain_nvidia_ai_endpoints import ChatNVIDIA  
from langchain_community.embeddings import HuggingFaceEmbeddings 
import json
import shutil
import os
import stat
import chromadb
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_core.documents import Document
from langchain.text_splitter import RecursiveCharacterTextSplitter

from langchain.agents import AgentExecutor, create_structured_chat_agent
from langchain.memory import ConversationBufferMemory
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_core.tools import Tool
from langchain_nvidia_ai_endpoints import ChatNVIDIA  
from langchain_core.tools import StructuredTool
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def handle_remove_readonly(func, path, exc_info):
    # Try to change the permission and retry
    os.chmod(path, stat.S_IWRITE)
    func(path)


app = FastAPI()
# for making contextual memory possible


persistent_directory = "chroma_db_with_metadata"


if os.path.exists(persistent_directory):
    print("✅ Loading vector store from:", persistent_directory)
else:
    raise FileNotFoundError(f"The vector store directory '{persistent_directory}' does not exist. Please run the vector creation script first.")

embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

db = Chroma(persist_directory=persistent_directory, embedding_function=embeddings)


retriever = db.as_retriever(search_type="similarity", search_kwargs={"k": 3})

# ✅ Use NVIDIA LLaMA 4 Scout
llm = ChatNVIDIA(
    model="meta/llama-4-scout-17b-16e-instruct",
    api_key="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",
    temperature=0.2,
    top_p=0.7,
    max_tokens=1024,
)

contextualize_q_system_prompt = (
    "You are a contextual memory assistant that reformulates user questions using chat history. "
    "Your goal is to turn the latest user message into a standalone, clear question that can be understood without prior context. "
    "If the question refers to a relative date (like 'last Thursday'), assume today's date is available and resolve it accordingly. "
    "Do NOT answer the question — just rewrite it as a complete standalone question."
)


contextualize_q_prompt = ChatPromptTemplate.from_messages([
    ("system", contextualize_q_system_prompt),
    MessagesPlaceholder("chat_history"),
    ("human", "{input}")
])

# History-aware retriever
history_aware_retriever = create_history_aware_retriever(
    llm, retriever, contextualize_q_prompt
)

qa_system_prompt = (
    "You are a shell command log assistant. Each log entry includes a command, the date it was run (in day-month-year format), and the day of the week. "
    "Your task is to answer user questions about past commands based on this log. Output the relevant shell command(s) exactly as they appear in the log. "
    "Do not explain or summarize — just show the command(s). "
    "If no matching command is found, you can respond with a short message like: no command found in my memory.\n\n{context}"
)


qa_prompt = ChatPromptTemplate.from_messages([
    ("system", qa_system_prompt),
    MessagesPlaceholder("chat_history"),
    ("human", "{input}")
])

def getDate(*args, **kwargs):
    from datetime import datetime
    current_date = datetime.now()

    # Manually format to remove leading zeros
    formatted_date = f"{current_date.day}-{current_date.month}-{current_date.year}"

    return formatted_date

def getDayName(*args,**kwargs):
    from datetime import datetime
    day_name = datetime.now().strftime("%A")
    return day_name 

def getDateFromWeekday(weekday_name: str,*args,**kwargs) -> str:
    from datetime import datetime, timedelta

    days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    today = datetime.now()
    today_index = today.weekday()
    weekday_name = weekday_name.strip("'")
    target_index = days.index(weekday_name)

    # Go back to the most recent past weekday (never today)
    delta_days = (today_index - target_index) % 7 or 7
    target_date = today - timedelta(days=delta_days)

    # Return in your format: d-m-yyyy
    return f"{target_date.day}-{target_date.month}-{target_date.year}"



question_answer_chain = create_stuff_documents_chain(llm, qa_prompt)

rag_chain = create_retrieval_chain(history_aware_retriever, question_answer_chain)

react_docstore_prompt = hub.pull("hwchase17/react")

tools = [
    Tool(
        name="Answer Question",
        func=lambda input, **kwargs: rag_chain.invoke({
            "input": input,
            "chat_history": kwargs.get("chat_history", [])
        }),
        description="Useful for answering questions using context documents.",
    ),
    Tool(
        name="Date",
        description="Extract the current date",
        func=getDate
    ),
    
    Tool(
        name="Day",
        description="Extract the current day",
        func=getDayName
    ),
    Tool(
    name="getDateFromWeekday",
    func=lambda weekday: getDateFromWeekday(weekday),
    description="Use this to get the date (in day-month-year) of the most recent past weekday, e.g. getDateFromWeekday('Wednesday')"
    )

]

agent = create_react_agent(llm=llm, tools=tools, prompt=react_docstore_prompt)

agent_executor = AgentExecutor.from_agent_and_tools(
    agent=agent,
    tools=tools,
    handle_parsing_errors=True,
    max_iterations=10
)

chat_history = []



@app.get("/contextualMemory/{query}")
def read_item(query):
    response = agent_executor.invoke({
        "input": query,
        "chat_history": chat_history
    })
    if('no' in response['output'] or 'command' in response['output'] or 'found' in response['output']):
        return "404"
    elif(response['output']=='Agent stopped due to iteration limit or time limit.'):
        return "No command found in my history, try prompt it better"
    chat_history.append(HumanMessage(content=query))
    chat_history.append(AIMessage(content=response["output"]))
    return response['output']


# smtp configuration
def send_email(recipient,body,title):    
    # Sender and receiver details
    sender_email = "officialmuhammadzain45@gmail.com"
    app_password = "qixp reet qcfp ujiy"
    receiver_email = recipient
    # Email content
    subject = title
    # Compose message
    message = MIMEMultipart()
    message['From'] = sender_email
    message['To'] = receiver_email
    message['Subject'] = subject
    message.attach(MIMEText(body, 'plain'))
    try:
        # Connect to Gmail SMTP server
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()  # Secure the connection
        server.login(sender_email, app_password)
        server.sendmail(sender_email, receiver_email, message.as_string())
        return "Email sent!"
    except Exception as e:
        return "Email didn't sent..."
    finally:
        server.quit()

def read_file(file_name,*args,**kwargs):
    f = open(file_name)
    return f.read()


send_email_tool = StructuredTool.from_function(
    func=send_email,
    name="sendEmail",
    description="Send an email. Provide recipient, body and title"
)
read_file_content = StructuredTool.from_function(
    func=read_file,
    name="readFile",
    description="use this tool to extract whatever is written inside a file that user has provided the name of"
)


tools_email = [send_email_tool,read_file_content]

prompt = hub.pull("hwchase17/structured-chat-agent")

llm = ChatNVIDIA(
    model="meta/llama-4-scout-17b-16e-instruct",
    api_key="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",
    temperature=0.2,
    top_p=0.7,
    max_tokens=1024,
)
memory = ConversationBufferMemory(
    memory_key="chat_history", return_messages=True
)

agent_email = create_structured_chat_agent(llm=llm, tools=tools_email, prompt=prompt)

agent_executor_email = AgentExecutor.from_agent_and_tools(
    agent=agent_email,
    tools=tools_email,
    verbose=True,
    memory=memory,
    handle_parsing_errors=True,
)

initial_message = (
    "You are helpful AI assistant that can write emails and provide helpful answers using only available tools or provide raw windows cli commands if user requests for it\n"
    "If you are unable to answer, you can use the following tools: sendEmail"
)
memory.chat_memory.add_message(SystemMessage(content=initial_message))




@app.get("/api/sendEmailviaLLM/{Prompt}")
def send_email_via_llm(Prompt):
    data = Prompt
    if("send" and "email"):
        user_input = data
        memory.chat_memory.add_message(HumanMessage(content=user_input))
        response = agent_executor_email.invoke({"input": user_input})
        memory.chat_memory.add_message(AIMessage(content=response["output"]))
        return response['output']
    return "Email has not sent successful"

@app.post("/api/updateChroma")
async def update_chroma(request:Request):
    data = await request.json()
    with open("my_data.txt","a") as f:
        for entry in data:
            formatted = json.dumps(entry,indent=2)
            f.write('\n'+formatted)
    

    client = chromadb.PersistentClient(path="chroma_db_with_metadata")
    client._system.stop()  
    del client
    shutil.rmtree('chroma_db_with_metadata',onerror=handle_remove_readonly)
    subprocess.Popen(["python", "create_vector_store.py"])
    exit()