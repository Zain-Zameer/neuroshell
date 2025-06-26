from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_core.documents import Document
from langchain.text_splitter import RecursiveCharacterTextSplitter
import os

# === CONFIGURATION ===
txt_file_path = "my_data.txt"  # Path to your text file
vectorstore_dir = "chroma_db_with_metadata"  # Folder to save your vector store

# === Load the text from file ===
with open(txt_file_path, "r", encoding="utf-8") as file:
    raw_text = file.read()

# === Split the text into smaller chunks ===
text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
texts = text_splitter.split_text(raw_text)

# === Convert chunks to LangChain documents ===
documents = [Document(page_content=chunk) for chunk in texts]

# === Load embedding model ===
embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

# === Create vector store and persist it ===
vectorstore = Chroma.from_documents(
    documents=documents,
    embedding=embeddings,
    persist_directory=vectorstore_dir,
)

vectorstore.persist()  # Save to disk
print("✅ Vector store created and saved to:", vectorstore_dir)
