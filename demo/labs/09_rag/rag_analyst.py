# Lab 9: The Analyst (Gen AI / RAG)
# Objective: Conversational Finance (RAG).

class MockRetrievalQA:
    def run(self, query):
        if "risk" in query.lower():
            return "Based on the 10-K, primary risks include supply chain disruptions and FX volatility."
        if "revenue" in query.lower():
            return "Q4 Revenue was $90B, up 5% YoY driven by services growth."
        return "I don't have enough context to answer that from the report."

def run_rag():
    print("📚 Indexing 'report.pdf' (Simulated)...")
    print("✅ Document Indexed in ChromaDB.")
    
    try:
        while True:
            query = input("❓ Ask the Analyst (or 'q' to quit): ")
            if query.lower() == 'q': break
            
            # Simulated RAG Chain
            qa_chain = MockRetrievalQA()
            response = qa_chain.run(query)
            
            print(f"🤖 Answer: {response}\n")
            
    except KeyboardInterrupt:
        pass

if __name__ == "__main__":
    # For demo non-interactive mode
    queries = ["What are the risks?", "How was the revenue?"]
    for q in queries:
        print(f"❓ Query: {q}")
        print(f"🤖 Answer: {MockRetrievalQA().run(q)}")
