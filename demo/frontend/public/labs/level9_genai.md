# Level 9: The Analyst (Gen AI / RAG)

> **Job Track**: 🧠 AI Engineer (GenAI Specialist)

## Objective
**Conversational Finance (RAG).**
AI models hallucinate. To trust them with money, we need to ground them in facts. You will build a **Retrieval Augmented Generation (RAG)** pipeline to read a company's Quarterly Report (PDF) and answer financial questions accurately.

## 🎯 Skills Learned
- `LangChain`
- `Vector Databases (ChromaDB)`
- `RAG Pipeline`
- `PDF Ingestion`

## The Mission
Your Portfolio Manager is too busy to read Apple's 10-K report. Build a tool where they can ask: "What are the risk factors this year?" and get a cited answer.

## Lab Instructions

### Step 1: Dependencies
Create a `requirements.txt` for your AI lab:
```text
langchain
langchain-community
chromadb
pypdf
sentence-transformers
```
Run `pip install -r requirements.txt`.

### Step 2: The Document
Download a sample "Apple 10-K" PDF (or use a dummy text file `report.txt` with financial data).
Place it in your project folder.

### Step 3: Ingest and Index
Create `analyst.py`:

```python
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import SentenceTransformerEmbeddings

# 1. Load
loader = PyPDFLoader("report.pdf")
pages = loader.load_and_split()

# 2. Split
text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
splits = text_splitter.split_documents(pages)

# 3. Store (Vector DB)
embedding = SentenceTransformerEmbeddings(model_name="all-MiniLM-L6-v2")
vectorstore = Chroma.from_documents(documents=splits, embedding=embedding)
retriever = vectorstore.as_retriever()

print("✅ Document Indexed.")
```

### Step 4: The Retrieval Chain
Append to `analyst.py`:

```python
from langchain.chains import RetrievalQA
from langchain_community.llms import OpenAI # or Ollama/LlamaCpp

# Mock LLM for local test if no API key
# llm = FakeListLLM(responses=["The risk factors are competition and regulation."])
# For real: llm = OpenAI(api_key="...")

qa_chain = RetrievalQA.from_chain_type(llm=llm, retriever=retriever)

query = "What is the guidance for Q4?"
response = qa_chain.run(query)
print(f"🤖 Answer: {response}")
```

## Outcome
You built an AI that can "read" files and answer questions based *only* on the provided context.
