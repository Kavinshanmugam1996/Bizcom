import pandas as pd

df = pd.DataFrame({
    "Question": ["What is ML?", "Is ML dangerous?"],
    "Answer": ["Machine Learning", "It depends"]
})

df.to_csv("test.csv", index=False)
print("test.csv created")
