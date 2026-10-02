"""Tiny RAG: TF-IDF retrieval over the policy DB (swap for pgvector/FAISS + embeddings in prod)."""
import os
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

PATH = os.path.join(os.path.dirname(__file__), "..", "..", "data", "fraud_policies.txt")


class PolicyRetriever:
    def __init__(self, path=PATH):
        self.docs = []
        with open(path, encoding="utf-8") as f:
            for line in f:
                if "|" in line:
                    pid, title, body = [x.strip() for x in line.split("|", 2)]
                    self.docs.append({"id": pid, "title": title, "text": body})
        self.vec = TfidfVectorizer(stop_words="english", ngram_range=(1, 2))
        self.mat = self.vec.fit_transform([d["title"] + " " + d["text"] for d in self.docs])
        self.feedback = []  # case feedback stored for later indexing

    def add_feedback(self, text: str):
        self.feedback.append(text)

    def search(self, query: str, k=3):
        sims = cosine_similarity(self.vec.transform([query]), self.mat)[0]
        idx = sims.argsort()[::-1][:k]
        return [{**self.docs[i], "score": round(float(sims[i]), 3)} for i in idx if sims[i] > 0]
