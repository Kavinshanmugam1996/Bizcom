import pandas as pd

df = pd.DataFrame({
    "Question": ["What is AI?", "Is AI dangerous?"],
    "Answer": ["Artificial Intelligence", "It depends on usage"]
})

df.to_excel("test.xlsx", index=False)
print("test.xlsx created")
